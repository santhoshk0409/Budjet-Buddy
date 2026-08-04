import Dexie, { type Table } from 'dexie';
import type { User, Wallet, ExpenseType, Expense, BudgetResetLog } from '../types';

export class WalletBuddyDB extends Dexie {
  users!: Table<User, string>;
  wallets!: Table<Wallet, string>;
  expenseTypes!: Table<ExpenseType, string>;
  expenses!: Table<Expense, string>;
  budgetResetLogs!: Table<BudgetResetLog, string>;

  constructor() {
    super('WalletBuddyDatabase');
    this.version(2).stores({
      users: 'id, &email',
      wallets: 'id, userId, name',
      expenseTypes: 'id, userId, name',
      expenses: 'id, userId, walletId, expenseTypeId, date, createdAt',
      budgetResetLogs: 'id, [userId+monthKey]'
    });
  }
}

export const db = new WalletBuddyDB();

// Helper to generate unique IDs
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

// Zero mock data generated
export const seedUserData = async (_userId: string) => {};

// Clear all local database tables
export const clearAllLocalData = async () => {
  await db.expenses.clear();
  await db.wallets.clear();
  await db.expenseTypes.clear();
  await db.users.clear();
  await db.budgetResetLogs.clear();
  localStorage.removeItem('wallet_buddy_user_id');
};

// Recalculate wallet spent and remaining balance strictly for a specific month (defaults to current month)
export const recalculateUserWallets = async (userId: string, monthKey?: string) => {
  const wallets = await db.wallets.where('userId').equals(userId).toArray();
  const activeWallets = wallets.filter(w => !w.isDeleted);
  const targetMonth = monthKey || new Date().toISOString().substring(0, 7);
  const expenses = await db.expenses.where('userId').equals(userId).toArray();

  for (const wallet of activeWallets) {
    const monthExpenses = expenses.filter(
      e => e.walletId === wallet.id && e.date.startsWith(targetMonth)
    );
    const spent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const remaining = wallet.budgetAmount - spent;

    await db.wallets.update(wallet.id, {
      spentAmount: spent,
      remainingAmount: remaining
    });
  }
};

// Add Expense with month-aware wallet balance calculation
export const createExpense = async (expenseData: Omit<Expense, 'id' | 'createdAt'>) => {
  const id = generateId();
  const createdAt = new Date().toISOString();
  const expense: Expense = { ...expenseData, id, createdAt };

  await db.transaction('rw', [db.expenses, db.wallets], async () => {
    await db.expenses.add(expense);
    const monthKey = expense.date.substring(0, 7);
    const expenses = await db.expenses.where('userId').equals(expense.userId).toArray();
    const walletExpenses = expenses.filter(
      e => e.walletId === expense.walletId && e.date.startsWith(monthKey)
    );
    const newSpent = walletExpenses.reduce((sum, e) => sum + e.amount, 0);
    const wallet = await db.wallets.get(expense.walletId);
    if (wallet) {
      await db.wallets.update(wallet.id, {
        spentAmount: newSpent,
        remainingAmount: wallet.budgetAmount - newSpent
      });
    }
  });

  return expense;
};

// Edit Expense with recalculation across old & new wallets
export const updateExpense = async (id: string, updatedData: Omit<Expense, 'id' | 'createdAt' | 'userId'>) => {
  await db.transaction('rw', [db.expenses, db.wallets], async () => {
    const oldExpense = await db.expenses.get(id);
    if (!oldExpense) return;

    await db.expenses.update(id, updatedData);
    const monthKey = updatedData.date.substring(0, 7);
    const expenses = await db.expenses.where('userId').equals(oldExpense.userId).toArray();

    // Update old wallet if changed
    const oldWalletExpenses = expenses.filter(
      e => e.walletId === oldExpense.walletId && e.date.startsWith(monthKey)
    );
    const oldSpent = oldWalletExpenses.reduce((sum, e) => sum + e.amount, 0);
    const oldWallet = await db.wallets.get(oldExpense.walletId);
    if (oldWallet) {
      await db.wallets.update(oldWallet.id, {
        spentAmount: oldSpent,
        remainingAmount: oldWallet.budgetAmount - oldSpent
      });
    }

    // Update new wallet
    const newWalletExpenses = expenses.filter(
      e => e.walletId === updatedData.walletId && e.date.startsWith(monthKey)
    );
    const newSpent = newWalletExpenses.reduce((sum, e) => sum + e.amount, 0);
    const newWallet = await db.wallets.get(updatedData.walletId);
    if (newWallet) {
      await db.wallets.update(newWallet.id, {
        spentAmount: newSpent,
        remainingAmount: newWallet.budgetAmount - newSpent
      });
    }
  });
};

// Delete Expense & restore wallet balance for that month
export const deleteExpense = async (id: string) => {
  await db.transaction('rw', [db.expenses, db.wallets], async () => {
    const expense = await db.expenses.get(id);
    if (!expense) return;

    await db.expenses.delete(id);
    const monthKey = expense.date.substring(0, 7);
    const expenses = await db.expenses.where('userId').equals(expense.userId).toArray();
    const walletExpenses = expenses.filter(
      e => e.walletId === expense.walletId && e.date.startsWith(monthKey)
    );
    const newSpent = walletExpenses.reduce((sum, e) => sum + e.amount, 0);
    const wallet = await db.wallets.get(expense.walletId);
    if (wallet) {
      await db.wallets.update(wallet.id, {
        spentAmount: newSpent,
        remainingAmount: wallet.budgetAmount - newSpent
      });
    }
  });
};
