
"use client";

import React, { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';

const API_KEY = 'luminael_gemini_api_key';
const API_KEY_TYPE = 'luminael_api_key_type';
const API_USAGE_KEY = 'luminael_api_usage';

const FREE_TIER_BUDGET = 50;
const PAID_TIER_BUDGET = 2000; // A high number for visual representation

export type KeyType = 'free' | 'paid';

interface ApiKeyContextType {
  apiKey: string | null;
  keyType: KeyType;
  setApiKey: (key: string, type: KeyType) => void;
  clearApiKey: () => void;
  loading: boolean;
  usage: { used: number; total: number };
  incrementUsage: (amount?: number) => void;
  resetUsage: () => void;
}

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

export function ApiKeyProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [keyType, setKeyType] = useState<KeyType>('free');
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState({ used: 0, total: FREE_TIER_BUDGET });

  useEffect(() => {
    try {
      const storedKey = window.localStorage.getItem(API_KEY);
      const storedType = window.localStorage.getItem(API_KEY_TYPE) as KeyType | null;

      if (storedKey) {
        setApiKey(storedKey);
      }
      if (storedType) {
        setKeyType(storedType);
      }
    } catch (error) {
      console.error("Failed to load API key info from localStorage", error);
      setApiKey(null);
      setKeyType('free');
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
          window.localStorage.setItem(API_USAGE_KEY, JSON.stringify({ used: 0, date: today }));
          setUsage(prev => ({ ...prev, used: 0 }));
        }
      } else {
        window.localStorage.setItem(API_USAGE_KEY, JSON.stringify({ used: 0, date: today }));
      }
    } catch (error) {
      console.error("Failed to load API usage from localStorage", error);
    }
  }, []);

  useEffect(() => {
    setUsage(prev => ({
        ...prev,
        total: keyType === 'free' ? FREE_TIER_BUDGET : PAID_TIER_BUDGET
    }));
  }, [keyType]);

  const saveApiKey = useCallback((newKey: string, newType: KeyType) => {
    try {
      if (newKey !== apiKey || newType !== keyType) {
        const today = new Date().toISOString().split('T')[0];
        const usageData = { used: 0, date: today };
        window.localStorage.setItem(API_USAGE_KEY, JSON.stringify(usageData));
        setUsage(prev => ({ ...prev, used: 0 }));
      }
      window.localStorage.setItem(API_KEY, newKey);
      window.localStorage.setItem(API_KEY_TYPE, newType);
      setApiKey(newKey);
      setKeyType(newType);
    } catch (error) {
      console.error("Failed to save API key to localStorage", error);
    }
  }, [apiKey, keyType]);
  
  const clearApiKey = useCallback(() => {
    try {
      window.localStorage.removeItem(API_KEY);
      window.localStorage.removeItem(API_KEY_TYPE);
      setApiKey(null);
      setKeyType('free');
      
      const today = new Date().toISOString().split('T')[0];
      const usageData = { used: 0, date: today };
      window.localStorage.setItem(API_USAGE_KEY, JSON.stringify(usageData));
      setUsage(prev => ({ ...prev, used: 0, total: FREE_TIER_BUDGET }));
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

  const value = { apiKey, keyType, setApiKey: saveApiKey, clearApiKey, loading, usage, incrementUsage, resetUsage };

  return React.createElement(ApiKeyContext.Provider, { value: value }, children);
}

export function useApiKey() {
  const context = useContext(ApiKeyContext);
  if (context === undefined) {
    throw new Error('useApiKey must be used within a ApiKeyProvider');
  }
  return context;
}
