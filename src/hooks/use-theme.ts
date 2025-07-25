
"use client";

import React, { createContext, useContext, useEffect, useCallback, ReactNode } from 'react';
import { useSyncExternalStore } from 'use-sync-external-store/shim';

const THEME_KEY = 'luminael_hell_bound_mode';

interface ThemeContextType {
  isHellBound: boolean;
  toggleHellBound: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const subscribe = (callback: () => void) => {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
};

const getSnapshot = () => {
  try {
    const item = window.localStorage.getItem(THEME_KEY);
    return item ? JSON.parse(item) : false;
  } catch (error) {
    return false;
  }
};

const getServerSnapshot = () => false;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const isHellBound = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleHellBound = useCallback(() => {
    const newValue = !getSnapshot();
    try {
      window.localStorage.setItem(THEME_KEY, JSON.stringify(newValue));
      // Dispatch a storage event to notify other tabs/windows
      window.dispatchEvent(new StorageEvent('storage', { key: THEME_KEY, newValue: JSON.stringify(newValue) }));
    } catch (error) {
      console.error("Failed to save theme to localStorage", error);
    }
  }, []);

  useEffect(() => {
    document.body.classList.toggle('hell-bound', isHellBound);
  }, [isHellBound]);

  const value = { isHellBound, toggleHellBound };

  return React.createElement(ThemeContext.Provider, { value: value }, children);
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
