import React from 'react';
import {
  Utensils,
  Fuel,
  ShoppingBag,
  Tv,
  PiggyBank,
  Receipt,
  Coffee,
  Home,
  Zap,
  Globe,
  Stethoscope,
  Plane,
  CreditCard,
  Briefcase,
  Gift,
  Car,
  Dumbbell,
  BookOpen,
  Wallet as WalletIcon,
  Tag
} from 'lucide-react';

export const ICON_OPTIONS = [
  { name: 'Utensils', icon: Utensils, label: 'Food & Dining' },
  { name: 'Fuel', icon: Fuel, label: 'Fuel & Gas' },
  { name: 'ShoppingBag', icon: ShoppingBag, label: 'Shopping' },
  { name: 'Tv', icon: Tv, label: 'Entertainment' },
  { name: 'PiggyBank', icon: PiggyBank, label: 'Savings' },
  { name: 'Receipt', icon: Receipt, label: 'Bills & Utilities' },
  { name: 'Coffee', icon: Coffee, label: 'Coffee & Snacks' },
  { name: 'Home', icon: Home, label: 'Rent & Housing' },
  { name: 'Zap', icon: Zap, label: 'Electricity' },
  { name: 'Globe', icon: Globe, label: 'Internet & Mobile' },
  { name: 'Stethoscope', icon: Stethoscope, label: 'Medicine & Health' },
  { name: 'Plane', icon: Plane, label: 'Travel & Transport' },
  { name: 'CreditCard', icon: CreditCard, label: 'Subscriptions' },
  { name: 'Briefcase', icon: Briefcase, label: 'Work & Business' },
  { name: 'Gift', icon: Gift, label: 'Gifts & Charity' },
  { name: 'Car', icon: Car, label: 'Vehicle Maintenance' },
  { name: 'Dumbbell', icon: Dumbbell, label: 'Fitness & Sports' },
  { name: 'BookOpen', icon: BookOpen, label: 'Education' }
];

interface IconProps {
  name?: string;
  className?: string;
  size?: number;
}

export const DynamicIcon: React.FC<IconProps> = ({ name, className = 'w-5 h-5', size = 20 }) => {
  if (!name) return <Tag className={className} size={size} />;

  const match = ICON_OPTIONS.find(item => item.name.toLowerCase() === name.toLowerCase());
  if (match) {
    const Component = match.icon;
    return <Component className={className} size={size} />;
  }

  // Fallback map by name keywords
  const lower = name.toLowerCase();
  if (lower.includes('food') || lower.includes('lunch') || lower.includes('dinner') || lower.includes('breakfast')) {
    return <Utensils className={className} size={size} />;
  }
  if (lower.includes('petrol') || lower.includes('fuel') || lower.includes('gas')) {
    return <Fuel className={className} size={size} />;
  }
  if (lower.includes('shop')) {
    return <ShoppingBag className={className} size={size} />;
  }
  if (lower.includes('ent') || lower.includes('movie')) {
    return <Tv className={className} size={size} />;
  }
  if (lower.includes('save') || lower.includes('invest')) {
    return <PiggyBank className={className} size={size} />;
  }
  if (lower.includes('bill') || lower.includes('rent') || lower.includes('elec')) {
    return <Receipt className={className} size={size} />;
  }
  if (lower.includes('coff')) {
    return <Coffee className={className} size={size} />;
  }

  return <WalletIcon className={className} size={size} />;
};
