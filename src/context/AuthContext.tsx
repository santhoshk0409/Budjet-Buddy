import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { db, generateId } from '../db/database';
import { SupabaseService } from '../services/supabaseService';
import { isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  theme: 'light' | 'dark';
  isCloudConnected: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  manualSync: () => Promise<void>;
  toggleTheme: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (newName: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCloudConnected] = useState<boolean>(isSupabaseConfigured);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

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

  // Manual & Auto Cloud Sync function
  const manualSync = useCallback(async () => {
    if (!currentUser || !isSupabaseConfigured) return;
    setIsSyncing(true);
    try {
      await SupabaseService.syncCloudToLocal(currentUser.id);
      await SupabaseService.syncLocalToCloud(currentUser.id);
      setLastSyncedAt(new Date());
    } catch (e) {
      console.error('Manual sync error:', e);
    } finally {
      setIsSyncing(false);
    }
  }, [currentUser]);

  // Session Restoration
  useEffect(() => {
    const checkSession = async () => {
      try {
        const savedUserId = localStorage.getItem('wallet_buddy_user_id');
        if (savedUserId) {
          let user = await db.users.get(savedUserId);
          if (user && isSupabaseConfigured) {
            const res = await SupabaseService.loginUser(user.email, user.password || 'Password123!');
            if (res.success && res.user) {
              user = res.user;
              await db.users.put(user);
              localStorage.setItem('wallet_buddy_user_id', user.id);
            }
          }
          if (user) {
            setCurrentUser(user);
            if (isSupabaseConfigured) {
              await SupabaseService.syncCloudToLocal(user.id);
              await SupabaseService.syncLocalToCloud(user.id);
              setLastSyncedAt(new Date());
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

  // Multi-device Cross-Device Realtime & Focus Auto-Sync
  useEffect(() => {
    if (!currentUser || !isSupabaseConfigured) return;

    // 1. Supabase Realtime Listener (Instant <500ms push on laptop edit)
    const unsubscribeRealtime = SupabaseService.subscribeToRealtimeChanges(currentUser.id, () => {
      setLastSyncedAt(new Date());
    });

    // 2. Tab Focus / App Re-open Sync Listener
    const handleFocusOrVisibility = () => {
      if (document.visibilityState === 'visible') {
        manualSync();
      }
    };

    window.addEventListener('focus', handleFocusOrVisibility);
    document.addEventListener('visibilitychange', handleFocusOrVisibility);

    // 3. Periodic 15-second background sync interval
    const interval = setInterval(() => {
      manualSync();
    }, 15000);

    return () => {
      unsubscribeRealtime();
      window.removeEventListener('focus', handleFocusOrVisibility);
      document.removeEventListener('visibilitychange', handleFocusOrVisibility);
      clearInterval(interval);
    };
  }, [currentUser, manualSync]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const trimmedEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured) {
      const res = await SupabaseService.loginUser(trimmedEmail, password);
      if (res.success && res.user) {
        await db.users.put(res.user);
        setCurrentUser(res.user);
        localStorage.setItem('wallet_buddy_user_id', res.user.id);
        setLastSyncedAt(new Date());
        return { success: true };
      } else if (res.error) {
        return { success: false, error: res.error };
      }
    }

    const user = await db.users.where('email').equals(trimmedEmail).first();
    if (user && user.password === password) {
      setCurrentUser(user);
      localStorage.setItem('wallet_buddy_user_id', user.id);
      return { success: true };
    }
    return { success: false, error: 'Invalid email ID or password.' };
  };

  const register = async (name: string, email: string, password: string) => {
    const trimmedEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured) {
      const cloudRes = await SupabaseService.registerUser(name, trimmedEmail, password);
      if (cloudRes.success && cloudRes.user) {
        await db.users.put(cloudRes.user);
        await SupabaseService.syncCloudToLocal(cloudRes.user.id);
        setCurrentUser(cloudRes.user);
        localStorage.setItem('wallet_buddy_user_id', cloudRes.user.id);
        setLastSyncedAt(new Date());
        return { success: true };
      } else if (cloudRes.error) {
        return { success: false, error: cloudRes.error };
      }
    }

    const existing = await db.users.where('email').equals(trimmedEmail).first();
    if (existing) {
      return { success: false, error: 'Email ID already registered.' };
    }

    const newUser: User = {
      id: generateId(),
      name,
      email: trimmedEmail,
      password,
      createdAt: new Date().toISOString()
    };

    await db.users.add(newUser);
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
        isSyncing,
        lastSyncedAt,
        manualSync,
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
