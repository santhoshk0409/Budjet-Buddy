import React, { useState, useEffect } from 'react';
import type { Wallet } from '../../types';
import { db, generateId } from '../../db/database';
import { useAuth } from '../../context/AuthContext';
import { SupabaseService } from '../../services/supabaseService';
import { ICON_MAP } from '../../utils/iconMap';
import { X, Check } from 'lucide-react';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletToEdit?: Wallet | null;
  wallet?: Wallet | null;
}

const COLOR_PALETTE = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#64748b'  // Slate
];

const AVAILABLE_ICONS = Object.keys(ICON_MAP);

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  walletToEdit,
  wallet
}) => {
  const activeWallet = walletToEdit || wallet;
  const { currentUser } = useAuth();
  const [name, setName] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [icon, setIcon] = useState('Utensils');

  useEffect(() => {
    if (activeWallet) {
      setName(activeWallet.name);
      setBudgetAmount(activeWallet.budgetAmount.toString());
      setColor(activeWallet.color || COLOR_PALETTE[0]);
      setIcon(activeWallet.icon || 'Utensils');
    } else {
      setName('');
      setBudgetAmount('');
      setColor(COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]);
      setIcon('Utensils');
    }
  }, [activeWallet, isOpen]);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedBudget = parseFloat(budgetAmount) || 0;

    if (activeWallet) {
      const remainingAmount = parsedBudget - activeWallet.spentAmount;
      const updates = {
        name: name.trim(),
        budgetAmount: parsedBudget,
        remainingAmount,
        color,
        icon
      };
      await db.wallets.update(activeWallet.id, updates);
      await SupabaseService.updateWallet(activeWallet.id, updates);
    } else {
      const newWallet: Wallet = {
        id: generateId(),
        userId: currentUser.id,
        name: name.trim(),
        budgetAmount: parsedBudget,
        spentAmount: 0,
        remainingAmount: parsedBudget,
        color,
        icon,
        createdAt: new Date().toISOString()
      };
      await db.wallets.add(newWallet);
      await SupabaseService.createWallet(newWallet);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {activeWallet ? 'Edit Wallet' : 'New Custom Wallet'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Wallet Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Travel, Gym, Groceries"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Monthly Budget (₹) *
            </label>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="0.00"
              value={budgetAmount}
              onChange={e => setBudgetAmount(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              required
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Color Code
            </label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {COLOR_PALETTE.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform hover:scale-110 cursor-pointer"
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Icon Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Choose Icon
            </label>
            <div className="grid grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1 border border-slate-100 dark:border-slate-800 rounded-2xl">
              {AVAILABLE_ICONS.map(iconKey => {
                const IconComp = ICON_MAP[iconKey];
                const isSelected = icon === iconKey;
                return (
                  <button
                    key={iconKey}
                    type="button"
                    onClick={() => setIcon(iconKey)}
                    className={`p-2.5 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {IconComp ? <IconComp className="w-5 h-5" /> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
            >
              {activeWallet ? 'Save Changes' : 'Create Wallet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
