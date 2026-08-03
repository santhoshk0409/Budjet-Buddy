import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Wallet, Smartphone, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

interface LoginViewProps {
  onSwitchToSignUp: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSwitchToSignUp }) => {
  const { login } = useAuth();
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!mobileNumber.trim() || !password) {
      setError('Please enter both mobile number and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await login(mobileNumber.trim(), password);
      if (!success) {
        setError('Invalid mobile number or password.');
      }
    } catch {
      setError('An error occurred during login. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 max-w-md mx-auto">
      {/* Header Branding */}
      <div className="pt-12 pb-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 mb-4 shadow-lg shadow-blue-500/20">
          <Wallet className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Welcome Back</h1>
        <p className="text-slate-400 text-sm">Manage your monthly budgets & daily expenses offline</p>
      </div>

      {/* Login Form Card */}
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl">
        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-800 text-red-300 text-sm rounded-xl flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Mobile Number
            </label>
            <div className="relative">
              <Smartphone className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={mobileNumber}
                onChange={e => setMobileNumber(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700/80 text-white rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700/80 text-white rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-2xl py-3.5 px-4 text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-400">
            Don't have an account?{' '}
            <button
              onClick={onSwitchToSignUp}
              className="text-blue-400 font-semibold hover:underline cursor-pointer"
            >
              Create New Account
            </button>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="py-4 text-center flex items-center justify-center gap-1.5 text-xs text-slate-500">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>100% Secure Offline Storage</span>
      </div>
    </div>
  );
};
