import React, { useState, useEffect } from 'react';
import type { Wallet } from '../../types';
import { db, generateId } from '../../db/database';
import { useAuth } from '../../context/AuthContext';
import { X, Check, Trash2, Wallet as WalletIcon } from 'lucide-react';
import { ICON_OPTIONS, DynamicIcon } from '../../utils/iconMap';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletToEdit?: Wallet | null;
}

const COLOR_PALETTE = [
  '#22c55e', '#eab308', '#ec4899', '#a855f7',
  '#3b82f6', '#ef4444', '#14b8a6', '#f97316',
  '#6366f1', '#84cc16', '#06b6d4', '#64748b'
];

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  walletToEdit
}) => {
  const { currentUser } = useAuth();
  const [name, setName] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [icon, setIcon] = useState('Utensils');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (walletToEdit) {
      setName(walletToEdit.name);
      setBudgetAmount(walletToEdit.budgetAmount.toString());
      setColor(walletToEdit.color || COLOR_PALETTE[0]);
      setIcon(walletToEdit.icon || 'Utensils');
    } else {
      setName('');
      setBudgetAmount('');
      setColor(COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]);
      setIcon('Utensils');
    }
    setError('');
  }, [walletToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Wallet Name is required.');
      return;
    }

    const parsedBudget = parseFloat(budgetAmount);
    if (isNaN(parsedBudget) || parsedBudget < 0) {
      setError('Please enter a valid monthly budget amount.');
      return;
    }

    setIsSaving(true);
    try {
      if (walletToEdit) {
        const remaining = parsedBudget - walletToEdit.spentAmount;
        await db.wallets.update(walletToEdit.id, {
          name: name.trim(),
          budgetAmount: parsedBudget,
          remainingAmount: remaining,
          color,
          icon
        });
      } else {
        await db.wallets.add({
          id: generateId(),
          userId: currentUser!.id,
          name: name.trim(),
          budgetAmount: parsedBudget,
          spentAmount: 0,
          remainingAmount: parsedBudget,
          color,
          icon,
          createdAt: new Date().toISOString()
        });
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save wallet.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!walletToEdit) return;
    if (confirm(`Are you sure you want to delete "${walletToEdit.name}" wallet?`)) {
      await db.wallets.update(walletToEdit.id, { isDeleted: true });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex flex-col justify-end max-w-md mx-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-[32px] p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <WalletIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {walletToEdit ? 'Edit Wallet' : 'Create New Wallet'}
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
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              Wallet Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Food, Petrol, Shopping"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              Monthly Budget (₹) *
            </label>
            <input
              type="number"
              placeholder="3000"
              value={budgetAmount}
              onChange={e => setBudgetAmount(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Color Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
              Wallet Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform cursor-pointer ${
                    color === c ? 'scale-110 ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-slate-900' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Icon Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
              Wallet Icon
            </label>
            <div className="grid grid-cols-6 gap-2 max-h-32 overflow-y-auto p-1">
              {ICON_OPTIONS.map(item => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setIcon(item.name)}
                  className={`p-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                    icon === item.name
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                  title={item.label}
                >
                  <DynamicIcon name={item.name} size={18} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            {walletToEdit && (
              <button
                type="button"
                onClick={handleDelete}
                className="p-3.5 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-2xl hover:bg-red-200 transition-colors cursor-pointer"
                title="Delete Wallet"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl py-3.5 px-4 text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-5 h-5" />
              <span>{isSaving ? 'Saving...' : walletToEdit ? 'Update Wallet' : 'Create Wallet'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
