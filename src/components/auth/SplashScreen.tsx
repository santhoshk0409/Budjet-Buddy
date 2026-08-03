import React from 'react';
import { Wallet, Sparkles } from 'lucide-react';

export const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-slate-900 text-white flex flex-col items-center justify-center p-6 z-50">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-emerald-400 p-0.5 shadow-2xl animate-pulse">
          <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center">
            <Wallet className="w-12 h-12 text-blue-400" />
          </div>
        </div>
        <Sparkles className="w-6 h-6 text-amber-400 absolute -top-2 -right-2 animate-bounce" />
      </div>

      <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent mb-2">
        Wallet Buddy
      </h1>
      <p className="text-slate-400 text-sm font-medium tracking-wide">Personal Finance & Budget Tracker</p>

      <div className="mt-12 flex items-center gap-2 text-slate-500 text-xs">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
        <span>Loading offline database...</span>
      </div>
    </div>
  );
};
