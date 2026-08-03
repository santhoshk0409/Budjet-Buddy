import { format, parseISO, isToday, isYesterday } from 'date-fns';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export const getGreeting = (name: string): string => {
  const hour = new Date().getHours();
  if (hour < 12) return `👋 Good Morning, ${name}`;
  if (hour < 17) return `👋 Good Afternoon, ${name}`;
  return `👋 Good Evening, ${name}`;
};

export const formatDateDisplay = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, dd MMMM yyyy');
  } catch {
    return dateString;
  }
};

export const formatShortDate = (dateString: string): string => {
  try {
    return format(parseISO(dateString), 'dd MMM yyyy');
  } catch {
    return dateString;
  }
};

export const calculateUsagePercentage = (spent: number, budget: number): number => {
  if (budget <= 0) return 0;
  return Math.min(Math.round((spent / budget) * 100), 999);
};

export const getProgressColorClass = (percentage: number): {
  bg: string;
  text: string;
  badge: string;
  status: 'normal' | 'warning' | 'danger' | 'exceeded';
} => {
  if (percentage >= 100) {
    return {
      bg: 'bg-red-500',
      text: 'text-red-600 dark:text-red-400',
      badge: 'bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300 border border-red-300 dark:border-red-800',
      status: 'exceeded'
    };
  }
  if (percentage >= 90) {
    return {
      bg: 'bg-red-500',
      text: 'text-red-500 dark:text-red-400',
      badge: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
      status: 'danger'
    };
  }
  if (percentage >= 70) {
    return {
      bg: 'bg-amber-500',
      text: 'text-amber-600 dark:text-amber-400',
      badge: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
      status: 'warning'
    };
  }
  return {
    bg: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    status: 'normal'
  };
};
