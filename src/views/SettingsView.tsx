import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../db/database';
import {
  Smartphone,
  Lock,
  LogOut,
  Wallet as WalletIcon,
  Tag,
  Moon,
  Sun,
  Download,
  Upload,
  Trash2,
  Check,
  Edit2,
  Settings as SettingsIcon
} from 'lucide-react';

interface SettingsViewProps {
  onOpenWalletModal: () => void;
  onOpenTypeModal: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onOpenWalletModal,
  onOpenTypeModal
}) => {
  const { currentUser, logout, updateProfile, changePassword, theme, toggleTheme } = useAuth();

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(currentUser?.name || '');

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');

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

  // CSV Data Export
  const handleExportCSV = async () => {
    if (!currentUser) return;
    const expenses = await db.expenses.where('userId').equals(currentUser.id).toArray();
    const wallets = await db.wallets.where('userId').equals(currentUser.id).toArray();
    const types = await db.expenseTypes.where('userId').equals(currentUser.id).toArray();

    const csvLines = ['ID,Date,Time,Amount (INR),Wallet,Category,Notes'];

    expenses.forEach(e => {
      const w = wallets.find(item => item.id === e.walletId);
      const t = types.find(item => item.id === e.expenseTypeId);
      const row = [
        e.id,
        e.date,
        e.time,
        e.amount,
        `"${w?.name || ''}"`,
        `"${t?.name || ''}"`,
        `"${(e.notes || '').replace(/"/g, '""')}"`
      ];
      csvLines.push(row.join(','));
    });

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `WalletBuddy_Expenses_${currentUser.name.replace(/\s+/g, '_')}.csv`;
    link.click();
  };

  // Full Backup Export JSON
  const handleExportJSON = async () => {
    if (!currentUser) return;
    const userWallets = await db.wallets.where('userId').equals(currentUser.id).toArray();
    const userTypes = await db.expenseTypes.where('userId').equals(currentUser.id).toArray();
    const userExpenses = await db.expenses.where('userId').equals(currentUser.id).toArray();

    const backupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      user: currentUser,
      wallets: userWallets,
      expenseTypes: userTypes,
      expenses: userExpenses
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `WalletBuddy_Backup_${currentUser.mobileNumber}.json`;
    link.click();
  };

  // Restore Data JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.expenses && Array.isArray(data.expenses)) {
          for (const exp of data.expenses) {
            await db.expenses.put({ ...exp, userId: currentUser.id });
          }
          setMessage({ type: 'success', text: 'Data restored successfully!' });
          setTimeout(() => setMessage(null), 3000);
        }
      } catch {
        setMessage({ type: 'error', text: 'Invalid JSON backup file.' });
      }
    };
    reader.readAsText(file);
  };

  // Reset All User Data (Completely delete wallets, categories, and expenses)
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
                <Smartphone className="w-3.5 h-3.5" />
                <span>{currentUser?.mobileNumber}</span>
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
        <span className="text-xs font-bold uppercase text-slate-400 pl-1">App Configuration</span>

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

      {/* Backup, Restore & Data Management */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase text-slate-400 pl-1">Data Backup & Restore</span>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleExportCSV}
            className="md3-card p-3 flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer hover:border-blue-400"
          >
            <Download className="w-5 h-5 text-blue-500" />
            <span className="text-xs font-bold text-slate-900 dark:text-white">Export CSV</span>
            <span className="text-[9px] text-slate-400">Excel Compatible</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="md3-card p-3 flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer hover:border-indigo-400"
          >
            <Download className="w-5 h-5 text-indigo-500" />
            <span className="text-xs font-bold text-slate-900 dark:text-white">Backup JSON</span>
            <span className="text-[9px] text-slate-400">Full Offline Backup</span>
          </button>
        </div>

        <label className="md3-card p-3.5 flex items-center justify-between cursor-pointer border-dashed border-slate-300 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <Upload className="w-5 h-5 text-emerald-500" />
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Import Backup File</div>
              <div className="text-[10px] text-slate-400">Restore from JSON backup</div>
            </div>
          </div>
          <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Upload</span>
        </label>

        <button
          onClick={handleResetData}
          className="w-full md3-card p-3.5 flex items-center justify-between text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer transition-colors"
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
