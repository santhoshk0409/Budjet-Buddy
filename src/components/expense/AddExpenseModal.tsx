import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { Wallet, ExpenseType, Expense } from '../../types';
import { db, createExpense, updateExpense } from '../../db/database';
import { formatCurrency } from '../../utils/formatters';
import { X, Calendar, Clock, FileText, Check, PlusCircle } from 'lucide-react';
import { DynamicIcon } from '../../utils/iconMap';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialExpense?: {
    id: string;
    amount: number;
    walletId: string;
    expenseTypeId?: string;
    date: string;
    time: string;
    notes?: string;
  };
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  initialExpense
}) => {
  const { currentUser } = useAuth();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);

  const [amount, setAmount] = useState<string>('');
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState<string>(
    new Date().toTimeString().split(' ')[0].substring(0, 5)
  );
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Load user wallets & expense types
  useEffect(() => {
    if (!currentUser || !isOpen) return;

    const fetchData = async () => {
      const wList = await db.wallets.where('userId').equals(currentUser.id).toArray();
      const activeWallets = wList.filter(w => !w.isDeleted);
      setWallets(activeWallets);

      const tList = await db.expenseTypes.where('userId').equals(currentUser.id).toArray();
      const activeTypes = tList.filter(t => !t.isDeleted);
      setExpenseTypes(activeTypes);

      const eList = await db.expenses.where('userId').equals(currentUser.id).toArray();
      setAllExpenses(eList);

      if (initialExpense) {
        setAmount(initialExpense.amount.toString());
        setSelectedWalletId(initialExpense.walletId);
        setSelectedTypeId(initialExpense.expenseTypeId || '');
        setDate(initialExpense.date);
        setTime(initialExpense.time);
        setNotes(initialExpense.notes || '');
      } else {
        setAmount('');
        if (activeWallets.length > 0) setSelectedWalletId(activeWallets[0].id);
        setSelectedTypeId('');
        setDate(new Date().toISOString().split('T')[0]);
        setTime(new Date().toTimeString().split(' ')[0].substring(0, 5));
        setNotes('');
      }
    };

    fetchData();
  }, [currentUser, isOpen, initialExpense]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid expense amount greater than 0.');
      return;
    }
    if (!selectedWalletId) {
      setError('Please select a wallet.');
      return;
    }

    setIsSaving(true);
    try {
      if (initialExpense) {
        await updateExpense(initialExpense.id, {
          walletId: selectedWalletId,
          expenseTypeId: selectedTypeId || undefined,
          amount: parsedAmount,
          date,
          time,
          notes: notes.trim()
        });
      } else {
        await createExpense({
          userId: currentUser!.id,
          walletId: selectedWalletId,
          expenseTypeId: selectedTypeId || undefined,
          amount: parsedAmount,
          date,
          time,
          notes: notes.trim()
        });
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save expense. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedWallet = wallets.find(w => w.id === selectedWalletId);

  const getRemainingForWallet = (w: Wallet) => {
    const monthKey = date ? date.substring(0, 7) : new Date().toISOString().substring(0, 7);
    const spentInMonth = allExpenses
      .filter(e => e.walletId === w.id && e.date.startsWith(monthKey))
      .reduce((sum, e) => sum + e.amount, 0);
    return w.budgetAmount - spentInMonth;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex flex-col justify-end max-w-md mx-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-[32px] p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {initialExpense ? 'Edit Expense' : 'Add New Expense'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-sm rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-2xl font-bold text-slate-400">₹</span>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl pl-10 pr-4 py-3 text-2xl font-bold focus:outline-none focus:border-blue-500"
                autoFocus
                required
              />
            </div>
          </div>

          {/* Wallet Dropdown */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold uppercase text-slate-400">Wallet *</label>
              {selectedWallet && (
                <span className="text-xs text-slate-500">
                  Remaining: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(getRemainingForWallet(selectedWallet))}</strong>
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
              {wallets.map(w => {
                const isSelected = w.id === selectedWalletId;
                const rem = getRemainingForWallet(w);
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setSelectedWalletId(w.id)}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs shrink-0"
                      style={{ backgroundColor: w.color || '#3b82f6' }}
                    >
                      <DynamicIcon name={w.icon} size={14} />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold truncate">{w.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{formatCurrency(rem)} left</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expense Type Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              Expense Category (Optional)
            </label>
            <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-1 border border-slate-100 dark:border-slate-800 rounded-2xl">
              <button
                type="button"
                onClick={() => setSelectedTypeId('')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  !selectedTypeId
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>None / Uncategorized</span>
              </button>
              {expenseTypes.map(t => {
                const isSelected = t.id === selectedTypeId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTypeId(prev => prev === t.id ? '' : t.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <DynamicIcon name={t.icon || t.name} size={14} />
                    <span>{t.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl pl-9 pr-3 py-2.5 text-xs font-medium focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Time</label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl pl-9 pr-3 py-2.5 text-xs font-medium focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Notes Optional */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              Notes (Optional)
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="e.g. Lunch at Haldiram's with team"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl py-3.5 px-4 text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
          >
            <Check className="w-5 h-5 stroke-[2.5]" />
            <span>{isSaving ? 'Saving...' : initialExpense ? 'Update Expense' : 'Save Expense'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
