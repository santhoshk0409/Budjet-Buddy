import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, generateId } from '../../db/database';
import { Calendar, RefreshCw, ArrowRight } from 'lucide-react';
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
      // Check if a reset log exists for this user and current month
      const existingLog = await db.budgetResetLogs
        .where({ userId: currentUser.id, monthKey: currentMonthKey })
        .first();

      if (!existingLog) {
        // Check if there are expenses from prior months
        const count = await db.expenses.where('userId').equals(currentUser.id).count();
        if (count > 0) {
          setIsOpen(true);
        }
      }
    };

    checkNewMonth();
  }, [currentUser, currentMonthKey]);

  if (!isOpen) return null;

  const handleCopyPreviousMonth = async () => {
    // Record log so prompt doesn't show again this month
    await db.budgetResetLogs.add({
      id: generateId(),
      userId: currentUser!.id,
      monthKey: currentMonthKey,
      action: 'copy',
      createdAt: new Date().toISOString()
    });

    setIsOpen(false);
  };

  const handleConfigureNewBudget = async () => {
    await db.budgetResetLogs.add({
      id: generateId(),
      userId: currentUser!.id,
      monthKey: currentMonthKey,
      action: 'new',
      createdAt: new Date().toISOString()
    });

    setIsOpen(false);
    onOpenWalletManagement();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 max-w-md mx-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
          <Calendar className="w-7 h-7" />
        </div>

        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Start New Month ({format(new Date(), 'MMMM yyyy')})?
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            All your past expense history is preserved. How would you like to set your monthly wallet budgets for this month?
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <button
            onClick={handleCopyPreviousMonth}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl py-3 px-4 text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Copy Previous Month Budget</span>
          </button>

          <button
            onClick={handleConfigureNewBudget}
            className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold rounded-2xl py-3 px-4 text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Create New Custom Budget</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
          🔒 Historic monthly data is never deleted.
        </div>
      </div>
    </div>
  );
};
