
"use client";

// SECURITY WARNING: Client-Side Trust
// This hook's state (apiKey, keyType, usage) is initialized from and persists to localStorage.
// This is insecure for managing anything with financial implications, such as API quotas or feature tiers.
// A malicious user can easily modify these values in their browser's developer tools to bypass restrictions.
//
// RECOMMENDATION:
// The source of truth for a user's API tier, budget, and usage must be on the server-side.
// 1. Store user-specific data (like tier and quota) in a secure database (e.g., Vercel KV, Firestore).
// 2. When a user makes an API request, the backend function should first validate the user's quota from the database before making the call to the external API (Gemini).
// 3. The client-side should only query and display this information, not enforce it.
//
// This file should be refactored to remove the client-side enforcement logic.

import React, { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';

const API_KEY = 'luminael_gemini_api_key';
const API_KEY_TYPE = 'luminael_api_key_type';
const API_USAGE_KEY = 'luminael_api_usage';
const API_PAID_CONFIG = 'luminael_api_paid_config';

export const FREE_TIER_BUDGET = 50;
export const UNLIMITED_BUDGET = 9999; // A high number for visual representation

export type KeyType = 'free' | 'paid';

export interface PaidTierConfig {
  type: 'unlimited' | 'custom';
  limit: number;
}

interface ApiKeyContextType {
  apiKey: string | null;
  keyType: KeyType;
  paidTierConfig: PaidTierConfig;
  setApiKey: (key: string, type: KeyType, paidConfig?: PaidTierConfig) => void;
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
  const [paidTierConfig, setPaidTierConfig] = useState<PaidTierConfig>({ type: 'unlimited', limit: UNLIMITED_BUDGET });
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState({ used: 0, total: FREE_TIER_BUDGET });

  useEffect(() => {
    try {
      const storedKey = window.localStorage.getItem(API_KEY);
      const storedType = window.localStorage.getItem(API_KEY_TYPE) as KeyType | null;
      const storedPaidConfig = window.localStorage.getItem(API_PAID_CONFIG);

      if (storedKey) setApiKey(storedKey);
      if (storedType) setKeyType(storedType);
      if (storedPaidConfig) setPaidTierConfig(JSON.parse(storedPaidConfig));

    } catch (error) {
      console.error("Failed to load API key info from localStorage", error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    try {
      const usageDataString = window.localStorage.getItem(API_USAGE_KEY);
      const today = new Date().toISOString().split('T')[0];

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
    setUsage(prev => {
        let newTotal = FREE_TIER_BUDGET;
        if (keyType === 'paid') {
            newTotal = paidTierConfig.type === 'custom' ? paidTierConfig.limit : UNLIMITED_BUDGET;
        }
        return { ...prev, total: newTotal };
    });
  }, [keyType, paidTierConfig]);

  const saveApiKey = useCallback((newKey: string, newType: KeyType, newPaidConfig?: PaidTierConfig) => {
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
      
      if (newType === 'paid' && newPaidConfig) {
        window.localStorage.setItem(API_PAID_CONFIG, JSON.stringify(newPaidConfig));
        setPaidTierConfig(newPaidConfig);
      }
    } catch (error) {
      console.error("Failed to save API key to localStorage", error);
    }
  }, [apiKey, keyType]);
  
  const clearApiKey = useCallback(() => {
    try {
      window.localStorage.removeItem(API_KEY);
      window.localStorage.removeItem(API_KEY_TYPE);
      window.localStorage.removeItem(API_PAID_CONFIG);
      
      setApiKey(null);
      setKeyType('free');
      setPaidTierConfig({ type: 'unlimited', limit: UNLIMITED_BUDGET });
      
      const today = new Date().toISOString().split('T')[0];
      const usageData = { used: 0, date: today };
      window.localStorage.setItem(API_USAGE_KEY, JSON.stringify(usageData));
      setUsage({ used: 0, total: FREE_TIER_BUDGET });
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

  const value = { apiKey, keyType, paidTierConfig, setApiKey: saveApiKey, clearApiKey, loading, usage, incrementUsage, resetUsage };

  return React.createElement(ApiKeyContext.Provider, { value: value }, children);
}

export function useApiKey() {
  const context = useContext(ApiKeyContext);
  if (context === undefined) {
    throw new Error('useApiKey must be used within a ApiKeyProvider');
  }
  return context;
}
