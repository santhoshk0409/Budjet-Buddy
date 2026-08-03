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
    this.version(1).stores({
      users: 'id, &mobileNumber',
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

// Seed function disabled to maintain 100% clean slate with zero mock data
export const seedUserData = async (_userId: string) => {
  // No mock data generated
};

// Clear all local database tables
export const clearAllLocalData = async () => {
  await db.expenses.clear();
  await db.wallets.clear();
  await db.expenseTypes.clear();
  await db.users.clear();
  await db.budgetResetLogs.clear();
  localStorage.removeItem('wallet_buddy_user_id');
};

// Recalculate wallet spent and remaining balance strictly from active expenses
export const recalculateUserWallets = async (userId: string) => {
  const wallets = await db.wallets.where('userId').equals(userId).toArray();
  const activeWallets = wallets.filter(w => !w.isDeleted);
  const expenses = await db.expenses.where('userId').equals(userId).toArray();

  for (const wallet of activeWallets) {
    const walletExpenses = expenses.filter(e => e.walletId === wallet.id);
    const spent = walletExpenses.reduce((sum, e) => sum + e.amount, 0);
    const remaining = wallet.budgetAmount - spent;

    await db.wallets.update(wallet.id, {
      spentAmount: spent,
      remainingAmount: remaining
    });
  }
};

// Add Expense with transaction balance calculation
export const createExpense = async (expenseData: Omit<Expense, 'id' | 'createdAt'>) => {
  const id = generateId();
  const createdAt = new Date().toISOString();
  const expense: Expense = { ...expenseData, id, createdAt };

  await db.transaction('rw', [db.expenses, db.wallets], async () => {
    await db.expenses.add(expense);

    const wallet = await db.wallets.get(expense.walletId);
    if (wallet) {
      const newSpent = wallet.spentAmount + expense.amount;
      const newRemaining = wallet.budgetAmount - newSpent;
      await db.wallets.update(wallet.id, {
        spentAmount: newSpent,
        remainingAmount: newRemaining
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

    if (oldExpense.walletId === updatedData.walletId) {
      const diff = updatedData.amount - oldExpense.amount;
      const wallet = await db.wallets.get(oldExpense.walletId);
      if (wallet) {
        const newSpent = wallet.spentAmount + diff;
        const newRemaining = wallet.budgetAmount - newSpent;
        await db.wallets.update(wallet.id, {
          spentAmount: newSpent,
          remainingAmount: newRemaining
        });
      }
    } else {
      const oldWallet = await db.wallets.get(oldExpense.walletId);
      if (oldWallet) {
        const oldSpent = oldWallet.spentAmount - oldExpense.amount;
        await db.wallets.update(oldWallet.id, {
          spentAmount: oldSpent,
          remainingAmount: oldWallet.budgetAmount - oldSpent
        });
      }
      const newWallet = await db.wallets.get(updatedData.walletId);
      if (newWallet) {
        const newSpent = newWallet.spentAmount + updatedData.amount;
        await db.wallets.update(newWallet.id, {
          spentAmount: newSpent,
          remainingAmount: newWallet.budgetAmount - newSpent
        });
      }
    }
  });
};

// Delete Expense & restore wallet balance
export const deleteExpense = async (id: string) => {
  await db.transaction('rw', [db.expenses, db.wallets], async () => {
    const expense = await db.expenses.get(id);
    if (!expense) return;

    await db.expenses.delete(id);

    const wallet = await db.wallets.get(expense.walletId);
    if (wallet) {
      const newSpent = wallet.spentAmount - expense.amount;
      const newRemaining = wallet.budgetAmount - newSpent;
      await db.wallets.update(wallet.id, {
        spentAmount: newSpent,
        remainingAmount: newRemaining
      });
    }
  });
};
