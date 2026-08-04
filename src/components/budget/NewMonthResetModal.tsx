import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, generateId } from '../../db/database';
import { SupabaseService } from '../../services/supabaseService';
import { Calendar, Plus, X } from 'lucide-react';
import { format } from 'date-fns';

export const NewMonthResetModal: React.FC<{ onOpenWalletManagement: () => void }> = ({
  onOpenWalletManagement
}) => {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const currentMonthKey = format(new Date(), 'yyyy-MM');

  useEffect(() => {
    if (!currentUser) return;

    const checkNewMonth = async () => {
      // 1. Check if user already dismissed or setup budget for this month
      const existingLog = await db.budgetResetLogs
        .where({ userId: currentUser.id, monthKey: currentMonthKey })
        .first();

      if (existingLog) return;

      // 2. Check if user already logged expenses in this current month
      const expensesThisMonth = await db.expenses
        .where('userId')
        .equals(currentUser.id)
        .filter(e => Boolean(e.date && e.date.startsWith(currentMonthKey)))
        .count();

      if (expensesThisMonth > 0) {
        // User already has data in current month -> auto suppress prompt
        await SupabaseService.logBudgetReset(currentUser.id, currentMonthKey, 'auto_dismissed');
        return;
      }

      setIsOpen(true);
    };

    checkNewMonth();
  }, [currentUser, currentMonthKey]);

  if (!isOpen) return null;

  const handleStartSetup = async () => {
    if (currentUser) {
      await SupabaseService.logBudgetReset(currentUser.id, currentMonthKey, 'new');
    }
    setIsOpen(false);
    onOpenWalletManagement();
  };

  const handleDismiss = async () => {
    if (currentUser) {
      await SupabaseService.logBudgetReset(currentUser.id, currentMonthKey, 'dismissed');
    }
    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 max-w-md mx-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-center relative animate-fade-in">
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30">
          <Calendar className="w-7 h-7" />
        </div>

        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Welcome to {format(new Date(), 'MMMM yyyy')}! 🎉
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            A new month has started. Add your wallets and monthly budgets to begin logging expenses.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={handleStartSetup}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl py-3.5 px-4 text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Wallet for {format(new Date(), 'MMMM')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
