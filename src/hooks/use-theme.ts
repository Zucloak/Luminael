"use client";

import { useState, useEffect, useCallback } from 'react';

const THEME_KEY = 'luminael_hell_bound_mode';

export function useTheme() {
  const [isHellBound, setIsHellBound] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let item: string | null = null;
    try {
      item = window.localStorage.getItem(THEME_KEY);
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

  return { isHellBound, setIsHellBound: setHellBound, loading };
}
