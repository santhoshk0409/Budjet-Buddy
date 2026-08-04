import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../db/database';
import {
  Mail,
  Lock,
  LogOut,
  Wallet as WalletIcon,
  Tag,
  Moon,
  Sun,
  Download,
  Trash2,
  Check,
  Edit2,
  Settings as SettingsIcon,
  FileText,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { format, startOfMonth } from 'date-fns';

interface SettingsViewProps {
  onOpenWalletModal: () => void;
  onOpenTypeModal: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onOpenWalletModal,
  onOpenTypeModal
}) => {
  const { currentUser, logout, updateProfile, changePassword, theme, toggleTheme, isSyncing, lastSyncedAt, manualSync } = useAuth();

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(currentUser?.name || '');

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // PDF Date Range Selection State
  const now = new Date();
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(now), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(now, 'yyyy-MM-dd'));

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    await updateProfile(nameInput.trim());
    setIsEditingName(false);
    setMessage({ type: 'success', text: 'Name updated successfully!' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    await changePassword(newPassword);
    setIsChangingPassword(false);
    setNewPassword('');
    setMessage({ type: 'success', text: 'Password changed successfully!' });
    setTimeout(() => setMessage(null), 3000);
  };

  // Download PDF Report by Date Range
  const handleDownloadPDF = async () => {
    if (!currentUser) return;

    if (!startDate || !endDate) {
      setMessage({ type: 'error', text: 'Please select both start date and end date.' });
      return;
    }

    if (startDate > endDate) {
      setMessage({ type: 'error', text: 'Start date must be before or equal to end date.' });
      return;
    }

    const allExpenses = await db.expenses.where('userId').equals(currentUser.id).toArray();
    const wallets = await db.wallets.where('userId').equals(currentUser.id).toArray();
    const types = await db.expenseTypes.where('userId').equals(currentUser.id).toArray();

    const rangeExpenses = allExpenses
      .filter(e => e.date >= startDate && e.date <= endDate)
      .sort((a, b) => b.date.localeCompare(a.date));

    const totalSpent = rangeExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalBudget = wallets.reduce((sum, w) => sum + w.budgetAmount, 0);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups in your browser to download the PDF report.');
      return;
    }

    const rowsHtml = rangeExpenses.map(e => {
      const w = wallets.find(item => item.id === e.walletId);
      const t = types.find(item => item.id === e.expenseTypeId);
      return `
        <tr>
          <td>${e.date} ${e.time}</td>
          <td><strong>${w?.name || 'Wallet'}</strong></td>
          <td>${t?.name || 'Uncategorized'}</td>
          <td>${e.notes || '-'}</td>
          <td style="text-align: right; font-weight: bold; color: #dc2626;">₹${e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Financial_Report_${startDate}_to_${endDate}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 28px; color: #0f172a; line-height: 1.5; background: #fff; }
          .header { border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
          .title { font-size: 22px; font-weight: 900; color: #1e3a8a; margin: 0; text-transform: uppercase; tracking: 0.5px; }
          .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
          .badge { background: #dbeafe; color: #1e40af; font-size: 11px; font-weight: 700; padding: 6px 12px; border-radius: 9999px; border: 1px solid #bfdbfe; }
          .metrics { display: flex; gap: 12px; margin-bottom: 24px; }
          .card { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px; }
          .card-label { font-size: 10px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.5px; }
          .card-val { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
          th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-weight: 700; border-bottom: 2px solid #cbd5e1; color: #334155; text-transform: uppercase; font-size: 11px; }
          td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #334155; }
          tr:nth-child(even) { background: #f8fafc; }
          .footer { text-align: center; margin-top: 32px; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          @media print {
            body { padding: 0; }
            @page { margin: 1cm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">BUDJET BUDDY STATEMENT</h1>
            <div class="subtitle">User: <strong>${currentUser.name}</strong> (${currentUser.email})</div>
          </div>
          <div class="badge">Date Range: ${startDate} to ${endDate}</div>
        </div>

        <div class="metrics">
          <div class="card">
            <div class="card-label">Total Expenses</div>
            <div class="card-val">${rangeExpenses.length} Records</div>
          </div>
          <div class="card">
            <div class="card-label">Total Spent in Period</div>
            <div class="card-val" style="color: #dc2626;">₹${totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="card">
            <div class="card-label">Total Active Budget</div>
            <div class="card-val" style="color: #2563eb;">₹${totalBudget.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        <h3 style="font-size: 14px; font-weight: 800; margin-bottom: 8px; color: #1e293b;">Expense Ledger (${rangeExpenses.length} Entries)</h3>
        ${rangeExpenses.length === 0 ? '<p style="font-size: 12px; color: #94a3b8; padding: 16px; background: #f8fafc; border-radius: 8px; text-align: center;">No expenses recorded in this date range.</p>' : `
          <table>
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Wallet</th>
                <th>Category</th>
                <th>Notes</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        `}

        <div class="footer">
          Generated by Budjet Buddy Personal Finance App on ${new Date().toLocaleString()}
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Reset All User Data
  const handleResetData = async () => {
    if (confirm('⚠️ WARNING: Are you sure you want to DELETE ALL wallets and expenses? This will wipe all existing wallets so you start 100% fresh.')) {
      if (!currentUser) return;
      await db.expenses.where('userId').equals(currentUser.id).delete();
      await db.wallets.where('userId').equals(currentUser.id).delete();
      await db.expenseTypes.where('userId').equals(currentUser.id).delete();

      try {
        const { supabase, isSupabaseConfigured } = await import('../lib/supabase');
        if (isSupabaseConfigured && supabase) {
          await supabase.from('expenses').delete().eq('user_id', currentUser.id);
          await supabase.from('wallets').delete().eq('user_id', currentUser.id);
          await supabase.from('expense_types').delete().eq('user_id', currentUser.id);
        }
      } catch (e) {
        console.error('Supabase clear error:', e);
      }

      setMessage({ type: 'success', text: 'All wallets and data purged successfully! You have a 100% clean slate.' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <span>App Settings</span>
        </h1>
      </div>

      {message && (
        <div
          className={`p-3 rounded-2xl text-xs font-bold ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-300'
              : 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300 border border-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* User Profile Card */}
      <div className="md3-card p-4 space-y-3 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-md">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              {isEditingName ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs px-2 py-1 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                  <button onClick={handleSaveName} className="p-1 text-emerald-500">
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">{currentUser?.name}</span>
                  <button onClick={() => setIsEditingName(true)} className="text-slate-400 hover:text-blue-500">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <Mail className="w-3.5 h-3.5" />
                <span>{currentUser?.email}</span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2.5 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>

        {/* Change Password Panel */}
        {isChangingPassword ? (
          <div className="pt-2 space-y-2">
            <input
              type="password"
              placeholder="New Password (min 6 chars)"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleChangePassword}
                className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
              >
                Save New Password
              </button>
              <button
                onClick={() => setIsChangingPassword(false)}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsChangingPassword(true)}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Change Password</span>
          </button>
        )}
      </div>

      {/* App Preferences & Tools */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase text-slate-400 pl-1">App Configuration & Cloud Sync</span>

        <div className="md3-card p-3.5 flex items-center justify-between cursor-pointer" onClick={manualSync}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Multi-Device Cloud Sync</div>
              <div className="text-[10px] text-slate-400">
                {isSyncing ? 'Syncing cloud data...' : lastSyncedAt ? 'Synced & up-to-date' : 'Sync data across Laptop & Mobile'}
              </div>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </span>
        </div>

        <div className="md3-card p-3.5 flex items-center justify-between cursor-pointer" onClick={toggleTheme}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-slate-800 text-amber-500">
              {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">App Theme</div>
              <div className="text-[10px] text-slate-400">Currently: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</div>
            </div>
          </div>
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Toggle</span>
        </div>

        <div className="md3-card p-3.5 flex items-center justify-between cursor-pointer" onClick={onOpenWalletModal}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <WalletIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Manage Wallets</div>
              <div className="text-[10px] text-slate-400">Add, edit budgets, change wallet colors</div>
            </div>
          </div>
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Manage</span>
        </div>

        <div className="md3-card p-3.5 flex items-center justify-between cursor-pointer" onClick={onOpenTypeModal}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Expense Categories</div>
              <div className="text-[10px] text-slate-400">Manage custom expense types</div>
            </div>
          </div>
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Manage</span>
        </div>
      </div>

      {/* Export PDF Statement Section (Replaces old CSV/JSON backup) */}
      <div className="space-y-3">
        <span className="text-xs font-bold uppercase text-slate-400 pl-1">Download PDF Statement</span>

        <div className="md3-card p-4 space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-white">Download PDF Report</h3>
              <p className="text-[10px] text-slate-400">Select date range to generate statement</p>
            </div>
          </div>

          {/* Date Range Selector Inputs */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Start Date</label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-2 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">End Date</label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-2 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Download PDF Action Button */}
          <button
            onClick={handleDownloadPDF}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl py-3 px-4 text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF Statement</span>
          </button>
        </div>

        {/* Reset Data Button */}
        <button
          onClick={handleResetData}
          className="w-full md3-card p-3.5 flex items-center justify-between text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer transition-colors mt-2"
        >
          <div className="flex items-center gap-3">
            <Trash2 className="w-5 h-5" />
            <div className="text-left">
              <div className="text-xs font-bold">Reset All Data</div>
              <div className="text-[10px] text-slate-400">Clear all expenses and restore budgets</div>
            </div>
          </div>
          <span className="text-xs font-bold">Reset</span>
        </button>
      </div>
    </div>
  );
};
