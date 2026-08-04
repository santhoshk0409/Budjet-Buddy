import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../context/AuthContext';
import { db, deleteExpense } from '../db/database';
import type { Expense, Wallet, ExpenseType, QuickFilter } from '../types';
import { formatCurrency, formatDateDisplay } from '../utils/formatters';
import { DynamicIcon } from '../utils/iconMap';
import { CalendarDateSelector } from '../components/common/CalendarDateSelector';
import {
  Search,
  Filter,
  Trash2,
  Edit,
  X,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Lock
} from 'lucide-react';
import {
  parseISO,
  subMonths,
  format,
  addMonths
} from 'date-fns';

interface HistoryViewProps {
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  onOpenExpenseDetail: (expense: Expense, wallet?: Wallet, type?: ExpenseType) => void;
  onEditExpense: (expense: Expense) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  selectedMonth,
  onSelectMonth,
  onOpenExpenseDetail,
  onEditExpense
}) => {
  const { currentUser } = useAuth();
  const currentMonthKey = format(new Date(), 'yyyy-MM');
  const isPastMonth = selectedMonth < currentMonthKey;
  const selectedMonthDate = parseISO(`${selectedMonth}-01`);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState<string>('all');
  const [selectedTypeId, setSelectedTypeId] = useState<string>('all');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('this_month');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Undo Toast state
  const [deletedExpense, setDeletedExpense] = useState<Expense | null>(null);

  // Month navigation handlers
  const handlePrevMonth = () => {
    const prev = subMonths(selectedMonthDate, 1);
    onSelectMonth(format(prev, 'yyyy-MM'));
  };

  const handleNextMonth = () => {
    if (selectedMonth >= currentMonthKey) return;
    const next = addMonths(selectedMonthDate, 1);
    onSelectMonth(format(next, 'yyyy-MM'));
  };

  // Live queries
  const wallets = useLiveQuery(
    async () => {
      if (!currentUser) return [];
      const list = await db.wallets.where('userId').equals(currentUser.id).toArray();
      return list.filter(w => !w.isDeleted);
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

  const rawExpenses = useLiveQuery(
    async () => {
      if (!currentUser) return [];
      return db.expenses
        .where('userId')
        .equals(currentUser.id)
        .reverse()
        .sortBy('date');
    },
    [currentUser?.id],
    []
  );

  const monthWallets = wallets.filter(w => w.monthKey ? w.monthKey === selectedMonth : selectedMonth === currentMonthKey);

  // Map expense dates to set for calendar dot highlighting
  const datesWithExpenses = useMemo(() => {
    const set = new Set<string>();
    rawExpenses.forEach(e => set.add(e.date));
    return set;
  }, [rawExpenses]);

  // Filtered expenses based on all active parameters & selectedMonth
  const filteredExpenses = useMemo(() => {
    return rawExpenses.filter(expense => {
      // Month scope filter
      if (!expense.date.startsWith(selectedMonth)) {
        return false;
      }

      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const wallet = wallets.find(w => w.id === expense.walletId);
        const type = expenseTypes.find(t => t.id === expense.expenseTypeId);
        const matchNotes = (expense.notes || '').toLowerCase().includes(q);
        const matchAmount = expense.amount.toString().includes(q);
        const matchWallet = (wallet?.name || '').toLowerCase().includes(q);
        const matchType = (type?.name || '').toLowerCase().includes(q);
        const matchDate = expense.date.includes(q);

        if (!matchNotes && !matchAmount && !matchWallet && !matchType && !matchDate) {
          return false;
        }
      }

      // 2. Wallet Filter
      if (selectedWalletId !== 'all' && expense.walletId !== selectedWalletId) {
        return false;
      }

      // 3. Expense Type Filter
      if (selectedTypeId !== 'all' && expense.expenseTypeId !== selectedTypeId) {
        return false;
      }

      // 4. Single Calendar Date Selection
      if (selectedCalendarDate) {
        return expense.date === selectedCalendarDate;
      }

      // 5. Custom Range Selection
      if (quickFilter === 'custom' && customStartDate && customEndDate) {
        return expense.date >= customStartDate && expense.date <= customEndDate;
      }

      return true;
    });
  }, [rawExpenses, selectedMonth, searchQuery, selectedWalletId, selectedTypeId, selectedCalendarDate, quickFilter, customStartDate, customEndDate, wallets, expenseTypes]);

  // Group expenses by Date string
  const groupedExpenses = useMemo(() => {
    const groups: { [dateStr: string]: Expense[] } = {};
    filteredExpenses.forEach(exp => {
      if (!groups[exp.date]) groups[exp.date] = [];
      groups[exp.date].push(exp);
    });
    return groups;
  }, [filteredExpenses]);

  const handleDelete = async (exp: Expense) => {
    if (isPastMonth) return;
    await deleteExpense(exp.id);
    setDeletedExpense(exp);
    setTimeout(() => setDeletedExpense(null), 5000);
  };

  const handleRestore = async () => {
    if (deletedExpense) {
      await db.expenses.add(deletedExpense);
      setDeletedExpense(null);
    }
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto space-y-4 animate-fade-in">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Expense History
        </h1>
      </div>

      {/* Month Navigator Header Bar (Compact & Sleek) */}
      <div className="flex items-center justify-between bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/60 rounded-xl px-2.5 py-1.5 shadow-xs">
        <button
          onClick={handlePrevMonth}
          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
          title="Previous Month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            {format(selectedMonthDate, 'MMMM yyyy')}
          </span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isPastMonth ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-300 border border-amber-300/50' : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-300 border border-emerald-300/50'}`}>
            {isPastMonth ? 'Archived' : 'Active'}
          </span>
        </div>

        <button
          onClick={handleNextMonth}
          disabled={selectedMonth >= currentMonthKey}
          className={`p-1 rounded-lg transition-colors ${
            selectedMonth >= currentMonthKey
              ? 'opacity-20 cursor-not-allowed text-slate-400'
              : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer'
          }`}
          title="Next Month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Read-Only Warning Banner for Past Months */}
      {isPastMonth && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 rounded-2xl text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Past month data for <strong>{format(selectedMonthDate, 'MMMM yyyy')}</strong> is in Read-Only mode.</span>
          </div>
          <button
            onClick={() => onSelectMonth(currentMonthKey)}
            className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] rounded-lg shrink-0 cursor-pointer"
          >
            Go Current
          </button>
        </div>
      )}

      {/* Interactive Calendar Date Selector Control */}
      <CalendarDateSelector
        quickFilter={quickFilter}
        onSelectQuickFilter={setQuickFilter}
        selectedDate={selectedCalendarDate}
        onSelectDate={setSelectedCalendarDate}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onSelectCustomRange={(start, end) => {
          setCustomStartDate(start);
          setCustomEndDate(end);
        }}
        datesWithExpenses={datesWithExpenses}
      />

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search notes, amount, wallet, category..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white rounded-2xl pl-10 pr-9 py-2.5 text-xs focus:outline-none focus:border-blue-500 shadow-sm"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Wallet & Type Filter Dropdowns */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <select
            value={selectedWalletId}
            onChange={e => setSelectedWalletId(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl px-3 py-2 text-xs font-semibold focus:outline-none cursor-pointer"
          >
            <option value="all">All Wallets</option>
            {monthWallets.map(w => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedTypeId}
            onChange={e => setSelectedTypeId(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl px-3 py-2 text-xs font-semibold focus:outline-none cursor-pointer"
          >
            <option value="all">All Categories</option>
            {expenseTypes.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grouped Expense Ledger */}
      {Object.keys(groupedExpenses).length === 0 ? (
        <div className="md3-card p-10 text-center text-slate-400">
          <Filter className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm font-semibold">No expenses found for {format(selectedMonthDate, 'MMMM yyyy')}.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.keys(groupedExpenses).map(dateStr => {
            const dayExpenses = groupedExpenses[dateStr];
            const dayTotal = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

            return (
              <div key={dateStr} className="space-y-2">
                {/* Date Header */}
                <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>{formatDateDisplay(dateStr)}</span>
                  <span className="text-slate-800 dark:text-slate-200">{formatCurrency(dayTotal)}</span>
                </div>

                {/* Expense Cards */}
                {dayExpenses.map(expense => {
                  const wallet = wallets.find(w => w.id === expense.walletId);
                  const type = expenseTypes.find(t => t.id === expense.expenseTypeId);

                  return (
                    <div
                      key={expense.id}
                      className="md3-card p-3.5 flex items-center justify-between relative group hover:border-blue-400 transition-all cursor-pointer"
                      onClick={() => onOpenExpenseDetail(expense, wallet, type)}
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
                            <span className="font-medium text-slate-600 dark:text-slate-300">
                              {wallet?.name || 'Wallet'}
                            </span>
                            {expense.notes && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[120px] italic">"{expense.notes}"</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                            - {formatCurrency(expense.amount)}
                          </div>
                          <div className="text-[10px] text-slate-400">{expense.time}</div>
                        </div>

                        {!isPastMonth && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                onEditExpense(expense);
                              }}
                              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 cursor-pointer"
                              title="Edit Expense"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                handleDelete(expense);
                              }}
                              className="p-2 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 hover:bg-red-100 cursor-pointer"
                              title="Delete Expense"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Undo Delete Notification */}
      {deletedExpense && (
        <div className="fixed bottom-20 left-4 right-4 max-w-md mx-auto bg-slate-900 text-white p-3 rounded-2xl shadow-2xl flex items-center justify-between z-50 text-xs border border-slate-700">
          <span>Expense deleted successfully.</span>
          <button
            type="button"
            onClick={handleRestore}
            className="text-amber-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
        </div>
      )}
    </div>
  );
};
