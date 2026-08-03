import React from 'react';
import type { Expense, Wallet, ExpenseType } from '../../types';
import { formatCurrency, formatDateDisplay } from '../../utils/formatters';
import { X, Edit2, Trash2, Calendar, Clock, FileText, Wallet as WalletIcon, Tag } from 'lucide-react';
import { DynamicIcon } from '../../utils/iconMap';

interface ExpenseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  wallet?: Wallet;
  expenseType?: ExpenseType;
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: string) => void;
}

export const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  isOpen,
  onClose,
  expense,
  wallet,
  expenseType,
  onEdit,
  onDelete
}) => {
  if (!isOpen || !expense) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex flex-col justify-end max-w-md mx-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-[32px] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Expense Details</span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount Banner */}
        <div className="text-center py-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl mb-5">
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {formatCurrency(expense.amount)}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-1">
            {expenseType?.name || 'Expense'}
          </div>
        </div>

        {/* Details Grid */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2.5 text-xs text-slate-500">
              <WalletIcon className="w-4 h-4 text-blue-500" />
              <span>Wallet</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: wallet?.color || '#3b82f6' }}
              />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {wallet?.name || 'Default Wallet'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2.5 text-xs text-slate-500">
              <Tag className="w-4 h-4 text-indigo-500" />
              <span>Category</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
              <DynamicIcon name={expenseType?.icon || expenseType?.name} size={14} />
              <span>{expenseType?.name || 'Uncategorized'}</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2.5 text-xs text-slate-500">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <span>Date</span>
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {formatDateDisplay(expense.date)}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2.5 text-xs text-slate-500">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Time</span>
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {expense.time}
            </span>
          </div>

          {expense.notes && (
            <div className="p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <FileText className="w-4 h-4 text-purple-500" />
                <span>Notes</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 italic pl-6">
                "{expense.notes}"
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              onClose();
              onEdit(expense);
            }}
            className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-2xl py-3 px-4 text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Edit2 className="w-4 h-4 text-blue-500" />
            <span>Edit</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onDelete(expense.id);
            }}
            className="w-full bg-red-50 dark:bg-red-950/60 hover:bg-red-100 text-red-600 dark:text-red-400 font-bold rounded-2xl py-3 px-4 text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};
