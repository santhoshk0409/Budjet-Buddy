import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Wallet, Expense, User } from '../types';
import { db, generateId } from '../db/database';

export class SupabaseService {
  static isActive(): boolean {
    return isSupabaseConfigured && supabase !== null;
  }

  // Update User Profile Name in Supabase Auth & public.profiles
  static async updateUserProfile(userId: string, name: string): Promise<boolean> {
    if (!this.isActive()) return false;
    try {
      await supabase!.from('profiles').upsert([{ id: userId, name }]);
      await supabase!.auth.updateUser({
        data: { name }
      });
      return true;
    } catch (e) {
      console.error('updateUserProfile error:', e);
      return false;
    }
  }

  // Change User Password in Supabase Auth
  static async changeUserPassword(newPassword: string): Promise<boolean> {
    if (!this.isActive()) return false;
    try {
      const { error } = await supabase!.auth.updateUser({
        password: newPassword
      });
      return !error;
    } catch (e) {
      console.error('changeUserPassword error:', e);
      return false;
    }
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
          return this.loginUser(trimmedEmail, password);
        }
        return { success: false, error: authError.message };
      }

      if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
        return this.loginUser(trimmedEmail, password);
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

      // Bi-directional sync with Supabase cloud
      await this.syncCloudToLocal(userId);
      await this.syncLocalToCloud(userId);

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
        id: wallet.id,
        user_id: wallet.userId,
        name: wallet.name,
        budget_amount: wallet.budgetAmount,
        spent_amount: wallet.spentAmount,
        remaining_amount: wallet.remainingAmount,
        color: wallet.color,
        icon: wallet.icon || 'Utensils',
        month_key: wallet.monthKey || null
      };

      const { error } = await supabase!
        .from('wallets')
        .upsert([payload]);

      if (error) {
        console.error('Supabase createWallet error:', error);
        return false;
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
        id: type.id,
        user_id: type.userId,
        name: type.name,
        icon: type.icon || 'Tag'
      };

      const { error } = await supabase!
        .from('expense_types')
        .upsert([payload]);

      if (error) {
        console.error('Supabase createExpenseType error:', error);
        return false;
      }

      return true;
    } catch (e) {
      console.error('createExpenseType cloud error:', e);
      return false;
    }
  }

  // Ensure default Category exists in Dexie & Supabase for NOT NULL constraint
  static async ensureDefaultExpenseType(userId: string): Promise<string> {
    const existing = await db.expenseTypes.where('userId').equals(userId).first();
    if (existing) {
      await this.createExpenseType(existing);
      return existing.id;
    }

    const defaultType = {
      id: generateId(),
      userId,
      name: 'General',
      icon: 'Tag'
    };

    await db.expenseTypes.put({
      id: defaultType.id,
      userId: defaultType.userId,
      name: defaultType.name,
      icon: defaultType.icon,
      isDeleted: false
    });

    await this.createExpenseType(defaultType);
    return defaultType.id;
  }

  // Add Expense to Cloud
  static async createExpense(expense: Expense): Promise<boolean> {
    if (!this.isActive()) return false;
    try {
      let typeId = expense.expenseTypeId;
      if (!typeId) {
        typeId = await this.ensureDefaultExpenseType(expense.userId);
      } else {
        const typeObj = await db.expenseTypes.get(typeId);
        if (typeObj) {
          await this.createExpenseType(typeObj);
        }
      }

      // Ensure parent wallet exists in cloud first
      const walletObj = await db.wallets.get(expense.walletId);
      if (walletObj) {
        await this.createWallet(walletObj);
      }

      const payload: any = {
        id: expense.id,
        user_id: expense.userId,
        wallet_id: expense.walletId,
        expense_type_id: typeId,
        amount: expense.amount,
        date: expense.date,
        time: expense.time,
        notes: expense.notes || null
      };

      const { error: expError } = await supabase!
        .from('expenses')
        .upsert([payload]);

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

  // Update Expense in Cloud
  static async updateExpense(expenseId: string, updates: Partial<Expense>): Promise<boolean> {
    if (!this.isActive()) return false;
    try {
      const cloudUpdates: any = {};
      if (updates.amount !== undefined) cloudUpdates.amount = updates.amount;
      if (updates.walletId !== undefined) cloudUpdates.wallet_id = updates.walletId;
      if (updates.expenseTypeId !== undefined) cloudUpdates.expense_type_id = updates.expenseTypeId || null;
      if (updates.date !== undefined) cloudUpdates.date = updates.date;
      if (updates.time !== undefined) cloudUpdates.time = updates.time;
      if (updates.notes !== undefined) cloudUpdates.notes = updates.notes || null;

      const { error } = await supabase!
        .from('expenses')
        .update(cloudUpdates)
        .eq('id', expenseId);

      if (error) console.error('Supabase updateExpense error:', error);
      return !error;
    } catch (e) {
      console.error('updateExpense cloud error:', e);
      return false;
    }
  }

  // Delete Expense from Cloud
  static async deleteExpense(expenseId: string): Promise<boolean> {
    if (!this.isActive()) return false;
    try {
      const { error } = await supabase!
        .from('expenses')
        .delete()
        .eq('id', expenseId);
      return !error;
    } catch (e) {
      console.error('deleteExpense cloud error:', e);
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

  // Push local Dexie records into Supabase cloud if missing from cloud
  static async syncLocalToCloud(userId: string) {
    if (!this.isActive()) return;

    try {
      // 1. Push missing wallets to cloud
      const localWallets = await db.wallets.where('userId').equals(userId).toArray();
      const { data: cloudWallets } = await supabase!.from('wallets').select('id').eq('user_id', userId);
      const cloudWalletIds = new Set((cloudWallets || []).map(w => w.id));

      for (const w of localWallets) {
        if (!w.isDeleted && !cloudWalletIds.has(w.id)) {
          await this.createWallet(w);
        }
      }

      // 2. Push missing expense types to cloud
      const localTypes = await db.expenseTypes.where('userId').equals(userId).toArray();
      const { data: cloudTypes } = await supabase!.from('expense_types').select('id').eq('user_id', userId);
      const cloudTypeIds = new Set((cloudTypes || []).map(t => t.id));

      for (const t of localTypes) {
        if (!t.isDeleted && !cloudTypeIds.has(t.id)) {
          await this.createExpenseType(t);
        }
      }

      // 3. Push missing expenses to cloud
      const localExpenses = await db.expenses.where('userId').equals(userId).toArray();
      const { data: cloudExpenses } = await supabase!.from('expenses').select('id').eq('user_id', userId);
      const cloudExpenseIds = new Set((cloudExpenses || []).map(e => e.id));

      for (const e of localExpenses) {
        if (!cloudExpenseIds.has(e.id)) {
          await this.createExpense(e);
        }
      }
    } catch (e) {
      console.error('syncLocalToCloud error:', e);
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
