import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../context/AuthContext';
import { db } from '../db/database';
import { formatCurrency, calculateUsagePercentage } from '../utils/formatters';
import { FileText, Download, CheckCircle2 } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { currentUser } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().substring(0, 7));

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

  const expenses = useLiveQuery(
    async () => {
      if (!currentUser) return [];
      return db.expenses.where('userId').equals(currentUser.id).toArray();
    },
    [currentUser?.id],
    []
  );

  // Filter expenses for selected month (YYYY-MM)
  const monthExpenses = useMemo(() => {
    return expenses.filter(e => e.date.startsWith(selectedMonth));
  }, [expenses, selectedMonth]);

  const totalBudget = wallets.reduce((sum, w) => sum + w.budgetAmount, 0);
  const totalSpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const remainingBudget = totalBudget - totalSpent;
  const budgetUtilization = calculateUsagePercentage(totalSpent, totalBudget);

  // Daily Stats
  const daysInMonthMap: { [date: string]: number } = {};
  monthExpenses.forEach(e => {
    daysInMonthMap[e.date] = (daysInMonthMap[e.date] || 0) + e.amount;
  });
  const activeDays = Object.keys(daysInMonthMap).length || 1;
  const avgDailySpend = totalSpent / activeDays;

  // Highest Spending Wallet
  const walletSpendingMap: { [walletId: string]: number } = {};
  monthExpenses.forEach(e => {
    walletSpendingMap[e.walletId] = (walletSpendingMap[e.walletId] || 0) + e.amount;
  });

  let highestWallet = { name: 'N/A', spent: 0 };
  Object.entries(walletSpendingMap).forEach(([wId, spent]) => {
    const w = wallets.find(item => item.id === wId);
    if (spent > highestWallet.spent) {
      highestWallet = { name: w?.name || 'Wallet', spent };
    }
  });

  // Highest Spending Category
  const categorySpendingMap: { [typeId: string]: number } = {};
  monthExpenses.forEach(e => {
    categorySpendingMap[e.expenseTypeId] = (categorySpendingMap[e.expenseTypeId] || 0) + e.amount;
  });

  let highestCategory = { name: 'N/A', spent: 0 };
  Object.entries(categorySpendingMap).forEach(([tId, spent]) => {
    const t = expenseTypes.find(item => item.id === tId);
    if (spent > highestCategory.spent) {
      highestCategory = { name: t?.name || 'Category', spent };
    }
  });

  // Highest Spending Day
  let highestDay = { date: 'N/A', spent: 0 };
  Object.entries(daysInMonthMap).forEach(([date, spent]) => {
    if (spent > highestDay.spent) {
      highestDay = { date, spent };
    }
  });

  // Download Report as formatted text file
  const handleExportReport = () => {
    const lines = [
      `==========================================`,
      `  WALLETS BUDDY - FINANCIAL SUMMARY REPORT`,
      `  User: ${currentUser?.name}`,
      `  Period: ${selectedMonth}`,
      `==========================================`,
      ``,
      `SUMMARY METRICS:`,
      `- Total Monthly Budget: ${formatCurrency(totalBudget)}`,
      `- Total Spent: ${formatCurrency(totalSpent)}`,
      `- Remaining Budget: ${formatCurrency(remainingBudget)}`,
      `- Budget Utilization: ${budgetUtilization}%`,
      `- Average Daily Spend: ${formatCurrency(avgDailySpend)}`,
      ``,
      `HIGHLIGHTS:`,
      `- Highest Spending Wallet: ${highestWallet.name} (${formatCurrency(highestWallet.spent)})`,
      `- Highest Spending Category: ${highestCategory.name} (${formatCurrency(highestCategory.spent)})`,
      `- Highest Spending Day: ${highestDay.date} (${formatCurrency(highestDay.spent)})`,
      ``,
      `WALLET BREAKDOWN:`,
      ...wallets.map(w => {
        const spent = walletSpendingMap[w.id] || 0;
        const pct = calculateUsagePercentage(spent, w.budgetAmount);
        return `  * ${w.name}: Budget ${formatCurrency(w.budgetAmount)} | Spent ${formatCurrency(spent)} | Remaining ${formatCurrency(w.budgetAmount - spent)} (${pct}%)`;
      }),
      ``,
      `Generated on: ${new Date().toLocaleString()}`
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Financial_Report_${selectedMonth}.txt`;
    link.click();
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <FileText className="w-6 h-6 text-emerald-500" />
          <span>Monthly Report</span>
        </h1>
        <button
          onClick={handleExportReport}
          className="p-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export Report</span>
        </button>
      </div>

      {/* Month Selector */}
      <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase">Select Month</span>
        <input
          type="month"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
        />
      </div>

      {/* Financial Summary Card */}
      <div className="md3-card p-5 bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-xl space-y-4">
        <div className="flex justify-between items-center border-b border-white/20 pb-3">
          <div>
            <span className="text-xs uppercase text-emerald-100 block">Budget Utilization</span>
            <span className="text-2xl font-black">{budgetUtilization}%</span>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-200" />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-white/10 p-2.5 rounded-xl">
            <span className="text-[10px] text-emerald-100 block">Budget</span>
            <strong className="text-xs">{formatCurrency(totalBudget)}</strong>
          </div>
          <div className="bg-white/10 p-2.5 rounded-xl">
            <span className="text-[10px] text-emerald-100 block">Spent</span>
            <strong className="text-xs">{formatCurrency(totalSpent)}</strong>
          </div>
          <div className="bg-white/10 p-2.5 rounded-xl">
            <span className="text-[10px] text-emerald-100 block">Remaining</span>
            <strong className="text-xs">{formatCurrency(remainingBudget)}</strong>
          </div>
        </div>
      </div>

      {/* Monthly Highlights Grid */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase text-slate-400">Monthly Highlights</h3>
        <div className="space-y-2 text-xs">
          <div className="md3-card p-3 flex justify-between items-center">
            <span className="text-slate-500 font-medium">Avg Daily Spend</span>
            <strong className="text-slate-900 dark:text-white font-bold">{formatCurrency(avgDailySpend)}</strong>
          </div>

          <div className="md3-card p-3 flex justify-between items-center">
            <span className="text-slate-500 font-medium">Highest Spending Wallet</span>
            <strong className="text-blue-600 dark:text-blue-400 font-bold">{highestWallet.name} ({formatCurrency(highestWallet.spent)})</strong>
          </div>

          <div className="md3-card p-3 flex justify-between items-center">
            <span className="text-slate-500 font-medium">Highest Spending Category</span>
            <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{highestCategory.name} ({formatCurrency(highestCategory.spent)})</strong>
          </div>

          <div className="md3-card p-3 flex justify-between items-center">
            <span className="text-slate-500 font-medium">Highest Spending Day</span>
            <strong className="text-amber-600 dark:text-amber-400 font-bold">{highestDay.date} ({formatCurrency(highestDay.spent)})</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
