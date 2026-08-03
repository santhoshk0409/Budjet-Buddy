import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Wallet, Expense, User } from '../types';
import { db } from '../db/database';

export class SupabaseService {
  static isActive(): boolean {
    return isSupabaseConfigured && supabase !== null;
  }

  // Register user on Supabase Auth + Cloud Profiles table
  static async registerUser(name: string, mobileNumber: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    if (!this.isActive()) return { success: false, error: 'Supabase is not configured.' };

    const fakeEmail = `${mobileNumber}@walletbuddy.app`;

    try {
      const { data: authData, error: authError } = await supabase!.auth.signUp({
        email: fakeEmail,
        password,
        options: {
          data: { name, mobile_number: mobileNumber }
        }
      });

      if (authError) {
        // If user already exists in cloud auth, attempt login directly
        if (authError.message.includes('already registered') || authError.message.includes('User already exists')) {
          return this.loginUser(mobileNumber, password);
        }
        return { success: false, error: authError.message };
      }

      const userId = authData.user?.id;
      if (!userId) {
        return { success: false, error: 'Failed to create cloud user account.' };
      }

      // Upsert profile in public.profiles table
      await supabase!.from('profiles').upsert([{
        id: userId,
        name,
        mobile_number: mobileNumber
      }]);

      const newUser: User = {
        id: userId,
        name,
        mobileNumber,
        password,
        createdAt: new Date().toISOString()
      };

      return { success: true, user: newUser };
    } catch (err: any) {
      console.error('Supabase registerUser error:', err);
      return { success: false, error: err.message || 'Cloud registration failed.' };
    }
  }

  // Login user on Supabase Auth
  static async loginUser(mobileNumber: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    if (!this.isActive()) return { success: false, error: 'Supabase is not configured.' };

    const fakeEmail = `${mobileNumber}@walletbuddy.app`;

    try {
      const { data: authData, error: authError } = await supabase!.auth.signInWithPassword({
        email: fakeEmail,
        password
      });

      if (authError || !authData.user) {
        // Check if unconfirmed email error
        if (authError?.message?.toLowerCase().includes('email not confirmed')) {
          return { success: false, error: 'Please disable "Confirm Email" in Supabase Auth settings to log in on all devices.' };
        }
        return { success: false, error: authError?.message || 'Invalid mobile number or password.' };
      }

      const userId = authData.user.id;
      const { data: profile } = await supabase!.from('profiles').select('*').eq('id', userId).single();

      const user: User = {
        id: userId,
        name: profile?.name || authData.user.user_metadata?.name || 'Sandy',
        mobileNumber,
        password,
        createdAt: authData.user.created_at
      };

      // Sync cloud wallets & categories to local Dexie
      await this.syncCloudToLocal(userId);

      return { success: true, user };
    } catch (err: any) {
      console.error('Supabase loginUser error:', err);
      return { success: false, error: err.message || 'Cloud login failed.' };
    }
  }

  // Sync Cloud database records into local Dexie
  static async syncCloudToLocal(userId: string) {
    if (!this.isActive()) return;

    try {
      // Wallets
      const { data: cloudWallets } = await supabase!.from('wallets').select('*').eq('user_id', userId);
      if (cloudWallets && cloudWallets.length > 0) {
        for (const cw of cloudWallets) {
          await db.wallets.put({
            id: cw.id,
            userId: cw.user_id,
            name: cw.name,
            budgetAmount: Number(cw.budget_amount),
            spentAmount: Number(cw.spent_amount),
            remainingAmount: Number(cw.remaining_amount),
            color: cw.color,
            icon: cw.icon,
            createdAt: cw.created_at,
            isDeleted: cw.is_deleted
          });
        }
      }

      // Expense Types
      const { data: cloudTypes } = await supabase!.from('expense_types').select('*').eq('user_id', userId);
      if (cloudTypes && cloudTypes.length > 0) {
        for (const ct of cloudTypes) {
          await db.expenseTypes.put({
            id: ct.id,
            userId: ct.user_id,
            name: ct.name,
            icon: ct.icon,
            isDeleted: ct.is_deleted
          });
        }
      }

      // Expenses
      const { data: cloudExpenses } = await supabase!.from('expenses').select('*').eq('user_id', userId);
      if (cloudExpenses && cloudExpenses.length > 0) {
        for (const ce of cloudExpenses) {
          await db.expenses.put({
            id: ce.id,
            userId: ce.user_id,
            walletId: ce.wallet_id,
            expenseTypeId: ce.expense_type_id,
            amount: Number(ce.amount),
            date: ce.date,
            time: ce.time,
            notes: ce.notes,
            createdAt: ce.created_at
          });
        }
      }
    } catch (e) {
      console.error('syncCloudToLocal error:', e);
    }
  }

  // Add Expense to Cloud & recalculate wallet
  static async createExpense(expense: Omit<Expense, 'id' | 'createdAt'>): Promise<boolean> {
    if (!this.isActive()) return false;
    const { error: expError } = await supabase!
      .from('expenses')
      .insert([{
        user_id: expense.userId,
        wallet_id: expense.walletId,
        expense_type_id: expense.expenseTypeId,
        amount: expense.amount,
        date: expense.date,
        time: expense.time,
        notes: expense.notes
      }]);

    if (expError) return false;

    const { data: wallet } = await supabase!
      .from('wallets')
      .select('*')
      .eq('id', expense.walletId)
      .single();

    if (wallet) {
      const newSpent = Number(wallet.spent_amount) + expense.amount;
      const newRemaining = Number(wallet.budget_amount) - newSpent;

      await supabase!
        .from('wallets')
        .update({
          spent_amount: newSpent,
          remaining_amount: newRemaining
        })
        .eq('id', expense.walletId);
    }

    return true;
  }
}
