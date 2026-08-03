import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Smartphone, Lock, UserCheck, ArrowRight, Wallet } from 'lucide-react';

interface SignUpViewProps {
  onSwitchToLogin: () => void;
}

export const SignUpView: React.FC<SignUpViewProps> = ({ onSwitchToLogin }) => {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Full Name is required.');
      return;
    }
    if (!mobileNumber.trim()) {
      setError('Mobile Number is required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Confirm password does not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register(fullName.trim(), mobileNumber.trim(), password);
      if (!res.success) {
        setError(res.error || 'Failed to create account.');
      }
    } catch {
      setError('An error occurred during sign up.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="pt-8 pb-4 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-blue-600 mb-3 shadow-lg shadow-emerald-500/20">
          <Wallet className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Create Account</h1>
        <p className="text-slate-400 text-sm">Start budgeting and tracking your expenses today</p>
      </div>

      {/* Form Card */}
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl">
        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-800 text-red-300 text-sm rounded-xl flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Sandy Kumar"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700/80 text-white rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Mobile Number *
            </label>
            <div className="relative">
              <Smartphone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="tel"
                placeholder="9876543210"
                value={mobileNumber}
                onChange={e => setMobileNumber(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700/80 text-white rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Password (min 6 chars) *
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700/80 text-white rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Confirm Password *
            </label>
            <div className="relative">
              <UserCheck className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700/80 text-white rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-2xl py-3.5 px-4 text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-5 pt-3.5 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-400">
            Already have an account?{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-emerald-400 font-semibold hover:underline cursor-pointer"
            >
              Login
            </button>
          </p>
        </div>
      </div>

      <div className="py-2 text-center text-xs text-slate-500">
        Wallet Buddy • Offline Personal Finance
      </div>
    </div>
  );
};
