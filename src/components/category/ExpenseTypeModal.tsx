import React, { useState, useEffect } from 'react';
import type { ExpenseType } from '../../types';
import { db, generateId } from '../../db/database';
import { useAuth } from '../../context/AuthContext';
import { X, Check, Tag, Trash2 } from 'lucide-react';
import { ICON_OPTIONS, DynamicIcon } from '../../utils/iconMap';

interface ExpenseTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  typeToEdit?: ExpenseType | null;
}

export const ExpenseTypeModal: React.FC<ExpenseTypeModalProps> = ({
  isOpen,
  onClose,
  typeToEdit
}) => {
  const { currentUser } = useAuth();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('Tag');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (typeToEdit) {
      setName(typeToEdit.name);
      setIcon(typeToEdit.icon || 'Tag');
    } else {
      setName('');
      setIcon('Tag');
    }
    setError('');
  }, [typeToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Category Name is required.');
      return;
    }

    setIsSaving(true);
    try {
      if (typeToEdit) {
        await db.expenseTypes.update(typeToEdit.id, {
          name: name.trim(),
          icon
        });
      } else {
        await db.expenseTypes.add({
          id: generateId(),
          userId: currentUser!.id,
          name: name.trim(),
          icon
        });
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save category.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!typeToEdit) return;
    if (confirm(`Are you sure you want to delete "${typeToEdit.name}" category?`)) {
      await db.expenseTypes.update(typeToEdit.id, { isDeleted: true });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex flex-col justify-end max-w-md mx-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-[32px] p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Tag className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {typeToEdit ? 'Edit Category' : 'Create Expense Category'}
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
              Category Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Snacks, Fuel, Subscriptions"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
              Category Icon
            </label>
            <div className="grid grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1">
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
            {typeToEdit && (
              <button
                type="button"
                onClick={handleDelete}
                className="p-3.5 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-2xl hover:bg-red-200 transition-colors cursor-pointer"
                title="Delete Category"
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
              <span>{isSaving ? 'Saving...' : typeToEdit ? 'Update Category' : 'Create Category'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
