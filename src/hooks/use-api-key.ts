
"use client";

import React, { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';

const API_KEY = 'luminael_gemini_api_key';
const API_USAGE_KEY = 'luminael_api_usage';
const DAILY_CALL_BUDGET = 200; // A visual budget for the user

interface ApiKeyContextType {
  apiKey: string | null;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
  loading: boolean;
  usage: { used: number; total: number };
  incrementUsage: (amount?: number) => void;
  resetUsage: () => void;
}

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

export function ApiKeyProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState({ used: 0, total: DAILY_CALL_BUDGET });

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(API_KEY);
      if (item) {
        setApiKey(item);
      }
    } catch (error) {
      console.error("Failed to load API key from localStorage", error);
      setApiKey(null);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    try {
      const usageDataString = window.localStorage.getItem(API_USAGE_KEY);
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      if (usageDataString) {
        const usageData = JSON.parse(usageDataString);
        if (usageData.date === today) {
          setUsage(prev => ({ ...prev, used: usageData.used }));
        } else {
          // New day, reset usage
          window.localStorage.setItem(API_USAGE_KEY, JSON.stringify({ used: 0, date: today }));
          setUsage(prev => ({ ...prev, used: 0 }));
        }
      } else {
        // No usage data, initialize it
        window.localStorage.setItem(API_USAGE_KEY, JSON.stringify({ used: 0, date: today }));
      }
    } catch (error) {
      console.error("Failed to load API usage from localStorage", error);
    }
  }, []);

  const saveApiKey = useCallback((newKey: string) => {
    try {
      // If the key is different from the one in state, reset the usage counter.
      if (newKey !== apiKey) {
        const today = new Date().toISOString().split('T')[0];
        const usageData = { used: 0, date: today };
        window.localStorage.setItem(API_USAGE_KEY, JSON.stringify(usageData));
        setUsage(prev => ({ ...prev, used: 0 }));
      }
      window.localStorage.setItem(API_KEY, newKey);
      setApiKey(newKey);
    } catch (error) {
      console.error("Failed to save API key to localStorage", error);
    }
  }, [apiKey]);
  
  const clearApiKey = useCallback(() => {
    try {
      window.localStorage.removeItem(API_KEY);
      setApiKey(null);
      // Also reset usage when key is cleared
      const today = new Date().toISOString().split('T')[0];
      const usageData = { used: 0, date: today };
      window.localStorage.setItem(API_USAGE_KEY, JSON.stringify(usageData));
      setUsage(prev => ({ ...prev, used: 0 }));
    } catch (error) {
      console.error("Failed to remove API key from localStorage", error);
    }
  }, []);

  const incrementUsage = useCallback((amount = 1) => {
    setUsage(currentUsage => {
      const newUsed = Math.min(currentUsage.used + amount, currentUsage.total);
      try {
        const today = new Date().toISOString().split('T')[0];
        const usageData = { used: newUsed, date: today };
        window.localStorage.setItem(API_USAGE_KEY, JSON.stringify(usageData));
      } catch (error) {
        console.error("Failed to save API usage to localStorage", error);
      }
      return { ...currentUsage, used: newUsed };
    });
  }, []);

  const resetUsage = useCallback(() => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const usageData = { used: 0, date: today };
      window.localStorage.setItem(API_USAGE_KEY, JSON.stringify(usageData));
      setUsage(prev => ({ ...prev, used: 0 }));
    } catch (error) {
      console.error("Failed to reset API usage in localStorage", error);
    }
  }, []);

  const value = { apiKey, setApiKey: saveApiKey, clearApiKey, loading, usage, incrementUsage, resetUsage };

  return React.createElement(ApiKeyContext.Provider, { value: value }, children);
}

export function useApiKey() {
  const context = useContext(ApiKeyContext);
  if (context === undefined) {
    throw new Error('useApiKey must be used within a ApiKeyProvider');
  }
  return context;
}
