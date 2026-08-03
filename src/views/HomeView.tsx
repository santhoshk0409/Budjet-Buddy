import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../context/AuthContext';
import { db } from '../db/database';
import type { Wallet, Expense, ExpenseType } from '../types';
import { formatCurrency, getGreeting, calculateUsagePercentage, getProgressColorClass, formatDateDisplay } from '../utils/formatters';
import { DynamicIcon } from '../utils/iconMap';
import {
  Wallet as WalletIcon,
  Plus,
  AlertTriangle,
  TrendingDown,
  Calendar,
  Clock,
  ChevronRight,
  Sparkles,
  PieChart,
  Moon,
  Sun
} from 'lucide-react';
import { startOfDay, startOfWeek, startOfMonth, parseISO, isAfter } from 'date-fns';

interface HomeViewProps {
  onOpenAddExpense: () => void;
  onOpenWalletModal: (wallet?: Wallet) => void;
  onOpenExpenseDetail: (expense: Expense, wallet?: Wallet, type?: ExpenseType) => void;
  onNavigateToHistory: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onOpenAddExpense,
  onOpenWalletModal,
  onOpenExpenseDetail,
  onNavigateToHistory
}) => {
  const { currentUser, theme, toggleTheme } = useAuth();
  const [undoExpense, setUndoExpense] = useState<Expense | null>(null);

  // Live queries for reactive Dexie data
  const wallets = useLiveQuery(
    async () => {
      if (!currentUser) return [];
      const list = await db.wallets.where('userId').equals(currentUser.id).toArray();
      return list.filter(w => !w.isDeleted);
    },
    [currentUser?.id],
    []
  );

  const expenses = useLiveQuery(
    async () => {
      if (!currentUser) return [];
      return db.expenses
        .where('userId')
        .equals(currentUser.id)
        .reverse()
        .sortBy('createdAt');
    },
    [currentUser?.id],
    []
  );

  const expenseTypes = useLiveQuery(
    async () => {
      if (!currentUser) return [];
      const list = await db.expenseTypes.where('userId').equals(currentUser.id).toArray();
      return list.filter(t => !t.isDeleted);
    },
    [currentUser?.id],
    []
  );

  // Calculations for Summary Cards
  const totalMonthlyBudget = wallets.reduce((sum, w) => sum + w.budgetAmount, 0);
  const totalSpent = wallets.reduce((sum, w) => sum + w.spentAmount, 0);
  const remainingBudget = totalMonthlyBudget - totalSpent;

  // Time-range spending calculations
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);

  let todaySpending = 0;
  let weeklySpending = 0;
  let monthlySpending = 0;

  expenses.forEach(exp => {
    try {
      const expDate = parseISO(exp.date);
      if (isAfter(expDate, todayStart) || exp.date === now.toISOString().split('T')[0]) {
        todaySpending += exp.amount;
      }
      if (isAfter(expDate, weekStart)) {
        weeklySpending += exp.amount;
      }
      if (isAfter(expDate, monthStart)) {
        monthlySpending += exp.amount;
      }
    } catch {
      // fallback calculation
    }
  });

  // Check budget warnings across wallets
  const warningWallets = wallets.filter(w => {
    const pct = calculateUsagePercentage(w.spentAmount, w.budgetAmount);
    return pct >= 80;
  });



  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto space-y-5 animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {getGreeting(currentUser?.name || 'User')}
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {currentUser?.name || 'Sandy'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-sm cursor-pointer"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
          </button>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'S'}
          </div>
        </div>
      </div>

      {/* Budget Warning Banner if any wallet >= 80% */}
      {warningWallets.length > 0 && (
        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 rounded-2xl text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-bold block">Budget Alert Warning</strong>
            {warningWallets.map(w => {
              const pct = calculateUsagePercentage(w.spentAmount, w.budgetAmount);
              return (
                <span key={w.id} className="block mt-0.5">
                  • <strong>{w.name}</strong> wallet is at <strong>{pct}%</strong> limit!
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Main Budget Card */}
        <div className="col-span-2 md3-card p-5 bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs uppercase tracking-wider text-blue-200 font-semibold">Total Monthly Budget</span>
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div className="text-3xl font-black mb-4 tracking-tight">
              {formatCurrency(totalMonthlyBudget)}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/15">
              <div>
                <span className="text-[11px] text-blue-200 block">Total Spent</span>
                <span className="text-sm font-bold">{formatCurrency(totalSpent)}</span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-blue-200 block">Remaining</span>
                <span className={`text-sm font-bold ${remainingBudget < 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                  {formatCurrency(remainingBudget)}
                </span>
              </div>
            </div>
          </div>
          <PieChart className="w-36 h-36 absolute -right-6 -bottom-6 text-white/10" />
        </div>

        {/* Today's Spend */}
        <div className="md3-card p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Today's Spend</span>
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-2">
            {formatCurrency(todaySpending)}
          </div>
        </div>

        {/* Weekly Spend */}
        <div className="md3-card p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Weekly Spend</span>
            <TrendingDown className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-2">
            {formatCurrency(weeklySpending)}
          </div>
        </div>
      </div>

      {/* Wallet Cards Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <WalletIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Wallets ({wallets.length})</span>
          </h2>
          <div className="flex items-center gap-3">
            {wallets.length > 0 && (
              <button
                type="button"
                onClick={async () => {
                  if (confirm('⚠️ Delete all existing demo wallets to start 100% fresh?')) {
                    await db.wallets.where('userId').equals(currentUser!.id).delete();
                    await db.expenses.where('userId').equals(currentUser!.id).delete();
                    try {
                      const { supabase, isSupabaseConfigured } = await import('../lib/supabase');
                      if (isSupabaseConfigured && supabase) {
                        await supabase.from('wallets').delete().eq('user_id', currentUser!.id);
                        await supabase.from('expenses').delete().eq('user_id', currentUser!.id);
                      }
                    } catch (e) {
                      console.error(e);
                    }
                  }
                }}
                className="text-xs font-semibold text-red-500 hover:underline cursor-pointer"
              >
                Clear All
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenWalletModal()}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Wallet</span>
            </button>
          </div>
        </div>

        {/* Horizontal Scroll / Carousel of Wallet Cards */}
        <div className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-none snap-x">
          {wallets.map(wallet => {
            const pct = calculateUsagePercentage(wallet.spentAmount, wallet.budgetAmount);
            const styleInfo = getProgressColorClass(pct);

            return (
              <div
                key={wallet.id}
                onClick={() => onOpenWalletModal(wallet)}
                className="snap-start shrink-0 w-64 md3-card p-4 flex flex-col justify-between cursor-pointer hover:border-blue-400 transition-all"
              >
                <div>
                  {/* Top row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm"
                        style={{ backgroundColor: wallet.color || '#3b82f6' }}
                      >
                        <DynamicIcon name={wallet.icon} size={16} />
                      </div>
                      <span className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-[110px]">
                        {wallet.name}
                      </span>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${styleInfo.badge}`}>
                      {pct >= 100 ? 'Budget Exceeded' : `${pct}%`}
                    </span>
                  </div>

                  {/* Budget & Remaining Stats */}
                  <div className="grid grid-cols-2 gap-1 text-xs mb-3">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Spent</span>
                      <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(wallet.spentAmount)}</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Budget</span>
                      <span className="font-semibold text-slate-600 dark:text-slate-400">{formatCurrency(wallet.budgetAmount)}</span>
                    </div>
                  </div>
                </div>

                {/* Animated Progress Bar */}
                <div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden mb-1">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${styleInfo.bg}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400">Remaining</span>
                    <span className={`font-bold ${wallet.remainingAmount < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {formatCurrency(wallet.remainingAmount)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Expenses List */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-500" />
            <span>Recent Expenses</span>
          </h2>
          <button
            onClick={onNavigateToHistory}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center cursor-pointer"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {expenses.length === 0 ? (
          <div className="md3-card p-8 text-center text-slate-400">
            <p className="text-sm">No expenses recorded yet.</p>
            <button
              onClick={onOpenAddExpense}
              className="mt-3 px-4 py-2 bg-blue-600 text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer"
            >
              + Add First Expense
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.slice(0, 5).map(expense => {
              const wallet = wallets.find(w => w.id === expense.walletId);
              const type = expenseTypes.find(t => t.id === expense.expenseTypeId);

              return (
                <div
                  key={expense.id}
                  onClick={() => onOpenExpenseDetail(expense, wallet, type)}
                  className="md3-card p-3.5 flex items-center justify-between cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm"
                      style={{ backgroundColor: wallet?.color || '#3b82f6' }}
                    >
                      <DynamicIcon name={type?.icon || wallet?.icon} size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white">
                        {type?.name || 'Expense'}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>{wallet?.name || 'Wallet'}</span>
                        <span>•</span>
                        <span>{formatDateDisplay(expense.date)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                      - {formatCurrency(expense.amount)}
                    </div>
                    <div className="text-[10px] text-slate-400">{expense.time}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Undo Delete Toast */}
      {undoExpense && (
        <div className="fixed bottom-20 left-4 right-4 max-w-md mx-auto bg-slate-900 text-white p-3 rounded-2xl shadow-2xl flex items-center justify-between z-50 text-xs border border-slate-700 animate-bounce">
          <span>Expense deleted.</span>
          <button
            onClick={async () => {
              await db.expenses.add(undoExpense);
              setUndoExpense(null);
            }}
            className="text-amber-400 font-bold hover:underline cursor-pointer"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
};
