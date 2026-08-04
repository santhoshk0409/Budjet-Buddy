import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Wallet, Expense, User } from '../types';
import { db } from '../db/database';

export class SupabaseService {
  static isActive(): boolean {
    return isSupabaseConfigured && supabase !== null;
  }

  // Register user on Supabase Auth + Cloud Profiles table
  static async registerUser(name: string, email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    if (!this.isActive()) return { success: false, error: 'Supabase is not configured.' };

    const trimmedEmail = email.trim().toLowerCase();

    try {
      const { data: authData, error: authError } = await supabase!.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: { name, email: trimmedEmail }
        }
      });

      if (authError) {
        if (
          authError.message.toLowerCase().includes('already registered') ||
          authError.message.toLowerCase().includes('user already exists') ||
          authError.message.toLowerCase().includes('already exists')
        ) {
          return { success: false, error: 'This Email ID is already registered. Please login instead.' };
        }
        return { success: false, error: authError.message };
      }

      if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
        return { success: false, error: 'This Email ID is already registered. Please login instead.' };
      }

      const userId = authData.user?.id;
      if (!userId) {
        return { success: false, error: 'Failed to create cloud user account.' };
      }

      // Upsert profile in public.profiles table
      const { error: profileErr } = await supabase!.from('profiles').upsert([{
        id: userId,
        name,
        email: trimmedEmail
      }]);

      if (profileErr) {
        console.error('Supabase profile upsert error:', profileErr);
      }

      const newUser: User = {
        id: userId,
        name,
        email: trimmedEmail,
        password,
        createdAt: new Date().toISOString()
      };

      return { success: true, user: newUser };
    } catch (err: any) {
      console.error('Supabase registerUser error:', err);
      return { success: false, error: err.message || 'Cloud registration failed.' };
    }
  }

  // Login user on Supabase Auth using Email
  static async loginUser(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    if (!this.isActive()) return { success: false, error: 'Supabase is not configured.' };

    const trimmedEmail = email.trim().toLowerCase();

    try {
      const { data: authData, error: authError } = await supabase!.auth.signInWithPassword({
        email: trimmedEmail,
        password
      });

      if (authError || !authData.user) {
        if (authError?.message?.toLowerCase().includes('email not confirmed')) {
          return { success: false, error: 'Email is unconfirmed. Turn OFF "Confirm email" in Supabase Auth Settings to log in.' };
        }
        return { success: false, error: authError?.message || 'Invalid email or password.' };
      }

      const userId = authData.user.id;
      const { data: profile } = await supabase!.from('profiles').select('*').eq('id', userId).single();

      // Ensure profile row exists in public.profiles
      if (!profile) {
        await supabase!.from('profiles').upsert([{
          id: userId,
          name: authData.user.user_metadata?.name || 'User',
          email: trimmedEmail
        }]);
      }

      const user: User = {
        id: userId,
        name: profile?.name || authData.user.user_metadata?.name || 'User',
        email: trimmedEmail,
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

  // Create Wallet in Cloud
  static async createWallet(wallet: Wallet): Promise<boolean> {
    if (!this.isActive()) return false;
    try {
      const payload: any = {
        user_id: wallet.userId,
        name: wallet.name,
        budget_amount: wallet.budgetAmount,
        spent_amount: wallet.spentAmount,
        remaining_amount: wallet.remainingAmount,
        color: wallet.color,
        icon: wallet.icon,
        month_key: wallet.monthKey || null
      };

      if (wallet.id && wallet.id.includes('-')) {
        payload.id = wallet.id;
      }

      const { data, error } = await supabase!
        .from('wallets')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('Supabase createWallet error:', error);
        return false;
      }

      if (data && data.id && data.id !== wallet.id) {
        await db.wallets.update(wallet.id, { id: data.id });
      }

      return true;
    } catch (e) {
      console.error('createWallet cloud error:', e);
      return false;
    }
  }

  // Update Wallet in Cloud
  static async updateWallet(walletId: string, updates: Partial<Wallet>): Promise<boolean> {
    if (!this.isActive()) return false;
    try {
      const cloudUpdates: any = {};
      if (updates.name !== undefined) cloudUpdates.name = updates.name;
      if (updates.budgetAmount !== undefined) cloudUpdates.budget_amount = updates.budgetAmount;
      if (updates.spentAmount !== undefined) cloudUpdates.spent_amount = updates.spentAmount;
      if (updates.remainingAmount !== undefined) cloudUpdates.remaining_amount = updates.remainingAmount;
      if (updates.color !== undefined) cloudUpdates.color = updates.color;
      if (updates.icon !== undefined) cloudUpdates.icon = updates.icon;
      if (updates.monthKey !== undefined) cloudUpdates.month_key = updates.monthKey;
      if (updates.isDeleted !== undefined) cloudUpdates.is_deleted = updates.isDeleted;

      const { error } = await supabase!
        .from('wallets')
        .update(cloudUpdates)
        .eq('id', walletId);

      if (error) console.error('Supabase updateWallet error:', error);
      return !error;
    } catch (e) {
      console.error('updateWallet cloud error:', e);
      return false;
    }
  }

  // Soft Delete Wallet in Cloud
  static async deleteWallet(walletId: string): Promise<boolean> {
    if (!this.isActive()) return false;
    try {
      const { error } = await supabase!
        .from('wallets')
        .update({ is_deleted: true })
        .eq('id', walletId);
      return !error;
    } catch (e) {
      console.error('deleteWallet cloud error:', e);
      return false;
    }
  }

  // Create Category in Cloud
  static async createExpenseType(type: { id: string; userId: string; name: string; icon?: string }): Promise<boolean> {
    if (!this.isActive()) return false;
    try {
      const payload: any = {
        user_id: type.userId,
        name: type.name,
        icon: type.icon || 'Tag'
      };

      if (type.id && type.id.includes('-')) {
        payload.id = type.id;
      }

      const { data, error } = await supabase!
        .from('expense_types')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('Supabase createExpenseType error:', error);
        return false;
      }

      if (data && data.id && data.id !== type.id) {
        await db.expenseTypes.update(type.id, { id: data.id });
      }

      return true;
    } catch (e) {
      console.error('createExpenseType cloud error:', e);
      return false;
    }
  }

  // Add Expense to Cloud & recalculate wallet
  static async createExpense(expense: Omit<Expense, 'id' | 'createdAt'>): Promise<boolean> {
    if (!this.isActive()) return false;
    try {
      const payload: any = {
        user_id: expense.userId,
        wallet_id: expense.walletId,
        expense_type_id: expense.expenseTypeId || null,
        amount: expense.amount,
        date: expense.date,
        time: expense.time,
        notes: expense.notes
      };

      const { error: expError } = await supabase!
        .from('expenses')
        .insert([payload]);

      if (expError) {
        console.error('Supabase createExpense error:', expError);
        return false;
      }

      return true;
    } catch (e) {
      console.error('createExpense cloud error:', e);
      return false;
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
            monthKey: cw.month_key || undefined,
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

      // Budget Reset Logs
      const { data: cloudLogs } = await supabase!.from('budget_reset_logs').select('*').eq('user_id', userId);
      if (cloudLogs && cloudLogs.length > 0) {
        for (const cl of cloudLogs) {
          await db.budgetResetLogs.put({
            id: cl.id,
            userId: cl.user_id,
            monthKey: cl.month_key,
            action: cl.action as any,
            createdAt: cl.created_at
          });
        }
      }
    } catch (e) {
      console.error('syncCloudToLocal error:', e);
    }
  }

  // Log Budget Reset locally and in cloud
  static async logBudgetReset(userId: string, monthKey: string, action: string) {
    const id = generateId();
    const createdAt = new Date().toISOString();

    await db.budgetResetLogs.put({
      id,
      userId,
      monthKey,
      action: action as any,
      createdAt
    });

    if (this.isActive()) {
      try {
        await supabase!.from('budget_reset_logs').insert([{
          user_id: userId,
          month_key: monthKey,
          action
        }]);
      } catch (e) {
        console.error('logBudgetReset cloud error:', e);
      }
    }
  }

  // Realtime subscription setup for instant cross-device updates
  static subscribeToRealtimeChanges(userId: string, onUpdate: () => void) {
    if (!this.isActive()) return () => {};

    try {
      const channel = supabase!
        .channel(`realtime-user-sync-${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'expenses', filter: `user_id=eq.${userId}` },
          async () => {
            await this.syncCloudToLocal(userId);
            onUpdate();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${userId}` },
          async () => {
            await this.syncCloudToLocal(userId);
            onUpdate();
          }
        )
        .subscribe();

      return () => {
        supabase!.removeChannel(channel);
      };
    } catch (e) {
      console.error('Realtime subscription error:', e);
      return () => {};
    }
  }
}
