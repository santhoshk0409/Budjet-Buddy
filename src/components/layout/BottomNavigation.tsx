import React from 'react';
import type { ViewTab } from '../../types';
import { Home, History, Plus, BarChart3, Settings } from 'lucide-react';

interface BottomNavigationProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  onOpenAddExpense: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentTab,
  onSelectTab,
  onOpenAddExpense
}) => {
  const tabs = [
    { id: 'home' as ViewTab, label: 'Home', icon: Home },
    { id: 'history' as ViewTab, label: 'History', icon: History },
    { id: 'add' as const, label: 'Add', icon: Plus, isFab: true },
    { id: 'analytics' as ViewTab, label: 'Analytics', icon: BarChart3 },
    { id: 'settings' as ViewTab, label: 'Settings', icon: Settings }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800/80 px-4 py-2 max-w-md mx-auto">
      <div className="flex items-center justify-around relative">
        {tabs.map(tab => {
          if (tab.isFab) {
            return (
              <button
                key={tab.id}
                onClick={onOpenAddExpense}
                className="relative -top-5 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/40 active:scale-95 transition-all cursor-pointer"
                title="Add Expense"
              >
                <Plus className="w-7 h-7 stroke-[2.5]" />
              </button>
            );
          }

          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id as ViewTab)}
              className={`flex flex-col items-center py-1 px-3 rounded-2xl transition-all cursor-pointer ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1.5 rounded-full transition-all ${
                  isActive ? 'bg-blue-50 dark:bg-blue-950/60' : ''
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
