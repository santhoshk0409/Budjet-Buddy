export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  createdAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  name: string;
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  color: string;
  icon: string;
  createdAt: string;
  isDeleted?: boolean;
  monthKey?: string;
}

export interface ExpenseType {
  id: string;
  userId: string;
  name: string;
  icon?: string;
  isDeleted?: boolean;
}

export interface Expense {
  id: string;
  userId: string;
  walletId: string;
  expenseTypeId?: string;
  amount: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  notes?: string;
  createdAt: string;
}

export interface BudgetResetLog {
  id: string;
  userId: string;
  monthKey: string; // YYYY-MM
  action: 'copy' | 'new';
  createdAt: string;
}

export type ViewTab = 'home' | 'history' | 'analytics' | 'settings' | 'reports';

export type QuickFilter = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';
