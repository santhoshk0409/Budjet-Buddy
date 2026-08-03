import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { db, generateId, seedUserData } from '../db/database';
import { SupabaseService } from '../services/supabaseService';
import { isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  theme: 'light' | 'dark';
  isCloudConnected: boolean;
  toggleTheme: () => void;
  login: (mobileNumber: string, password: string) => Promise<boolean>;
  register: (name: string, mobileNumber: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (newName: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCloudConnected] = useState<boolean>(isSupabaseConfigured);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('wallet_buddy_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('wallet_buddy_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Session Restoration
  useEffect(() => {
    const checkSession = async () => {
      try {
        const savedUserId = localStorage.getItem('wallet_buddy_user_id');
        if (savedUserId) {
          const user = await db.users.get(savedUserId);
          if (user) {
            setCurrentUser(user);
            if (isSupabaseConfigured) {
              await SupabaseService.syncCloudToLocal(user.id);
            } else {
              await seedUserData(user.id);
            }
          }
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = async (mobileNumber: string, password: string): Promise<boolean> => {
    // 1. Try Supabase Cloud Login if configured
    if (isSupabaseConfigured) {
      const res = await SupabaseService.loginUser(mobileNumber, password);
      if (res.success && res.user) {
        // Cache user locally in Dexie & localStorage
        await db.users.put(res.user);
        setCurrentUser(res.user);
        localStorage.setItem('wallet_buddy_user_id', res.user.id);
        return true;
      }
    }

    // 2. Fallback to Local IndexedDB Login
    const user = await db.users.where('mobileNumber').equals(mobileNumber).first();
    if (user && user.password === password) {
      setCurrentUser(user);
      localStorage.setItem('wallet_buddy_user_id', user.id);
      await seedUserData(user.id);
      return true;
    }
    return false;
  };

  const register = async (name: string, mobileNumber: string, password: string) => {
    // 1. Try Supabase Cloud Sign Up
    if (isSupabaseConfigured) {
      const cloudRes = await SupabaseService.registerUser(name, mobileNumber, password);
      if (cloudRes.success && cloudRes.user) {
        await db.users.put(cloudRes.user);
        await SupabaseService.syncCloudToLocal(cloudRes.user.id);
        setCurrentUser(cloudRes.user);
        localStorage.setItem('wallet_buddy_user_id', cloudRes.user.id);
        return { success: true };
      } else if (cloudRes.error) {
        // If Supabase returned specific error
        console.warn('Supabase auth failed, trying local register:', cloudRes.error);
      }
    }

    // 2. Fallback to Local Registration
    const existing = await db.users.where('mobileNumber').equals(mobileNumber).first();
    if (existing) {
      return { success: false, error: 'Mobile number already registered.' };
    }

    const newUser: User = {
      id: generateId(),
      name,
      mobileNumber,
      password,
      createdAt: new Date().toISOString()
    };

    await db.users.add(newUser);
    await seedUserData(newUser.id);
    setCurrentUser(newUser);
    localStorage.setItem('wallet_buddy_user_id', newUser.id);
    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('wallet_buddy_user_id');
  };

  const updateProfile = async (newName: string) => {
    if (!currentUser) return;
    await db.users.update(currentUser.id, { name: newName });
    setCurrentUser({ ...currentUser, name: newName });
  };

  const changePassword = async (newPassword: string) => {
    if (!currentUser) return;
    await db.users.update(currentUser.id, { password: newPassword });
    setCurrentUser({ ...currentUser, password: newPassword });
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        theme,
        isCloudConnected,
        toggleTheme,
        login,
        register,
        logout,
        updateProfile,
        changePassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
