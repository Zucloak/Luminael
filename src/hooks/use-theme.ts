"use client";

import React, { useState, useEffect, useCallback, createContext, ReactNode, useContext } from 'react';

const THEME_KEY = 'luminael_hell_bound_mode';

interface ThemeContextType {
  isHellBound: boolean;
  setIsHellBound: (value: boolean) => void;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isHellBound, setIsHellBound] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(THEME_KEY);
      if (item) {
        setIsHellBound(JSON.parse(item));
      }
    } catch (error) {
      console.error("Failed to parse theme from localStorage", error);
      setIsHellBound(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const setHellBound = useCallback((value: boolean) => {
    try {
      window.localStorage.setItem(THEME_KEY, JSON.stringify(value));
      setIsHellBound(value);
    } catch (error) {
      console.error("Failed to save theme to localStorage", error);
    }
  }, []);

  const value = { isHellBound, setIsHellBound: setHellBound, loading };

  return React.createElement(ThemeContext.Provider, { value: value }, children);
}


export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
