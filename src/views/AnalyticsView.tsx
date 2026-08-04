import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../context/AuthContext';
import { db } from '../db/database';
import type { QuickFilter } from '../types';
import { formatCurrency } from '../utils/formatters';
import { DynamicIcon } from '../utils/iconMap';
import { CalendarDateSelector } from '../components/common/CalendarDateSelector';
import {
  BarChart3,
  Wallet as WalletIcon,
  Tag,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  parseISO,
  format,
  subMonths,
  addMonths
} from 'date-fns';

interface AnalyticsViewProps {
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  selectedMonth,
  onSelectMonth
}) => {
  const { currentUser } = useAuth();
  const currentMonthKey = format(new Date(), 'yyyy-MM');
  const isPastMonth = selectedMonth < currentMonthKey;
  const selectedMonthDate = parseISO(`${selectedMonth}-01`);

  const [quickFilter, setQuickFilter] = useState<QuickFilter>('this_month');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

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
      return db.expenses.where('userId').equals(currentUser.id).toArray();
    },
    [currentUser?.id],
    []
  );

  // Map expense dates for calendar dots
  const datesWithExpenses = useMemo(() => {
    const set = new Set<string>();
    rawExpenses.forEach(e => set.add(e.date));
    return set;
  }, [rawExpenses]);

  // Filter expenses strictly by selectedMonth and active date sub-filters
  const filteredExpenses = useMemo(() => {
    return rawExpenses.filter(e => {
      if (!e.date.startsWith(selectedMonth)) return false;
      if (selectedDate) return e.date === selectedDate;
      if (quickFilter === 'custom' && customStartDate && customEndDate) {
        return e.date >= customStartDate && e.date <= customEndDate;
      }
      return true;
    });
  }, [rawExpenses, selectedMonth, selectedDate, quickFilter, customStartDate, customEndDate]);

  // Overall Spending Stats
  const totalPeriodSpent = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Daily Breakdown Map
  const dailySpendingMap = useMemo(() => {
    const map: { [date: string]: number } = {};
    filteredExpenses.forEach(e => {
      map[e.date] = (map[e.date] || 0) + e.amount;
    });
    return map;
  }, [filteredExpenses]);

  const activeDaysCount = Object.keys(dailySpendingMap).length;
  const avgDailySpend = activeDaysCount > 0 ? totalPeriodSpent / activeDaysCount : 0;

  // Highest & Lowest spending days
  const dailyEntries = Object.entries(dailySpendingMap);
  let highestDay = { date: 'N/A', amount: 0 };
  let lowestDay = { date: 'N/A', amount: Infinity };

  if (dailyEntries.length > 0) {
    dailyEntries.forEach(([d, amt]) => {
      if (amt > highestDay.amount) highestDay = { date: d, amount: amt };
      if (amt < lowestDay.amount) lowestDay = { date: d, amount: amt };
    });
  } else {
    lowestDay = { date: 'N/A', amount: 0 };
  }

  // Wallet Breakdown Analytics
  const monthWallets = useMemo(() => {
    return wallets.filter(w => w.monthKey ? w.monthKey === selectedMonth : selectedMonth === currentMonthKey);
  }, [wallets, selectedMonth, currentMonthKey]);

  const walletSpending = useMemo(() => {
    return monthWallets.map(wallet => {
      const spentInPeriod = filteredExpenses
        .filter(e => e.walletId === wallet.id)
        .reduce((sum, e) => sum + e.amount, 0);
      const percentage = totalPeriodSpent > 0 ? Math.round((spentInPeriod / totalPeriodSpent) * 100) : 0;
      const budgetUsagePct = wallet.budgetAmount > 0 ? Math.round((spentInPeriod / wallet.budgetAmount) * 100) : 0;
      return {
        ...wallet,
        spentInPeriod,
        percentage,
        budgetUsagePct
      };
    }).sort((a, b) => b.spentInPeriod - a.spentInPeriod);
  }, [monthWallets, filteredExpenses, totalPeriodSpent]);

  // Expense Type Category Analytics
  const typeSpending = useMemo(() => {
    const list = expenseTypes.map(type => {
      const spent = filteredExpenses
        .filter(e => e.expenseTypeId === type.id)
        .reduce((sum, e) => sum + e.amount, 0);
      const percentage = totalPeriodSpent > 0 ? Math.round((spent / totalPeriodSpent) * 100) : 0;
      return {
        ...type,
        spent,
        percentage
      };
    }).filter(t => t.spent > 0);

    const uncategorizedExpenses = filteredExpenses.filter(
      e => !e.expenseTypeId || !expenseTypes.some(t => t.id === e.expenseTypeId)
    );

    const walletUncatMap: { [walletId: string]: number } = {};
    uncategorizedExpenses.forEach(e => {
      walletUncatMap[e.walletId] = (walletUncatMap[e.walletId] || 0) + e.amount;
    });

    Object.entries(walletUncatMap).forEach(([wId, spent]) => {
      const w = wallets.find(item => item.id === wId);
      list.push({
        id: `wallet-uncat-${wId}`,
        userId: '',
        name: w?.name || 'General Wallet',
        icon: w?.icon || 'Wallet',
        spent,
        percentage: totalPeriodSpent > 0 ? Math.round((spent / totalPeriodSpent) * 100) : 0
      });
    });

    return list.sort((a, b) => b.spent - a.spent);
  }, [expenseTypes, filteredExpenses, wallets, totalPeriodSpent]);

  const top5Categories = typeSpending.slice(0, 5);
  const leastUsedCategory = typeSpending.length > 0 ? typeSpending[typeSpending.length - 1] : null;

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto space-y-5 animate-fade-in">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <span>Spending Analytics</span>
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

      {/* Calendar Date Selector Component */}
      <CalendarDateSelector
        quickFilter={quickFilter}
        onSelectQuickFilter={setQuickFilter}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onSelectCustomRange={(start, end) => {
          setCustomStartDate(start);
          setCustomEndDate(end);
        }}
        datesWithExpenses={datesWithExpenses}
      />

      {/* Analytics KPI Highlights */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 md3-card p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-xl">
          <span className="text-xs uppercase tracking-wider text-slate-400">Total Spending ({format(selectedMonthDate, 'MMM yyyy')})</span>
          <div className="text-3xl font-black mt-1 text-emerald-400">
            {formatCurrency(totalPeriodSpent)}
          </div>
          <div className="text-xs text-slate-400 mt-2 flex justify-between border-t border-slate-800 pt-2">
            <span>Avg Daily Spend: <strong>{formatCurrency(avgDailySpend)}</strong></span>
            <span>Active Days: <strong>{activeDaysCount}</strong></span>
          </div>
        </div>

        <div className="md3-card p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Highest Spend Day</span>
          <div className="text-sm font-bold text-slate-900 dark:text-white">
            {formatCurrency(highestDay.amount)}
          </div>
          <div className="text-[10px] text-slate-400">{highestDay.date !== 'N/A' ? format(parseISO(highestDay.date), 'dd MMM yyyy') : 'N/A'}</div>
        </div>

        <div className="md3-card p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Lowest Spend Day</span>
          <div className="text-sm font-bold text-slate-900 dark:text-white">
            {formatCurrency(lowestDay.amount === Infinity ? 0 : lowestDay.amount)}
          </div>
          <div className="text-[10px] text-slate-400">{lowestDay.date !== 'N/A' ? format(parseISO(lowestDay.date), 'dd MMM yyyy') : 'N/A'}</div>
        </div>
      </div>

      {/* Wallet Spending Visual Breakdown */}
      <div className="md3-card p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <WalletIcon className="w-4 h-4 text-blue-500" />
          <span>Wallet Wise Spending</span>
        </h2>

        {totalPeriodSpent === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">No expenses recorded for {format(selectedMonthDate, 'MMMM yyyy')}.</div>
        ) : (
          <div className="space-y-2.5">
            {walletSpending.map(wallet => (
              <div key={wallet.id} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: wallet.color || '#3b82f6' }}
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{wallet.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatCurrency(wallet.spentInPeriod)}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {wallet.budgetUsagePct}% of {formatCurrency(wallet.budgetAmount)} budget used
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(wallet.budgetUsagePct, 100)}%`,
                      backgroundColor: wallet.color || '#3b82f6'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expense Type / Category Breakdown */}
      <div className="md3-card p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Tag className="w-4 h-4 text-indigo-500" />
          <span>Top Spending Categories</span>
        </h2>

        {top5Categories.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">No category data available for this month.</div>
        ) : (
          <div className="space-y-2.5">
            {top5Categories.map((type, rank) => (
              <div key={type.id} className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center">
                    #{rank + 1}
                  </div>
                  <DynamicIcon name={type.icon || type.name} size={16} />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{type.name}</span>
                </div>

                <div className="text-right">
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                    {formatCurrency(type.spent)}
                  </div>
                  <div className="text-[10px] text-slate-400">{type.percentage}% of total</div>
                </div>
              </div>
            ))}

            {leastUsedCategory && (
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex justify-between">
                <span>Least Used Category:</span>
                <strong className="text-slate-700 dark:text-slate-300">{leastUsedCategory.name} ({formatCurrency(leastUsedCategory.spent)})</strong>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
