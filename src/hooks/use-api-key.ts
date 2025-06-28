"use client";

import React, { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';

const API_KEY = 'luminael_gemini_api_key';

interface ApiKeyContextType {
  apiKey: string | null;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
  loading: boolean;
}

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

export function ApiKeyProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  const saveApiKey = useCallback((key: string) => {
    try {
      window.localStorage.setItem(API_KEY, key);
      setApiKey(key);
    } catch (error) {
      console.error("Failed to save API key to localStorage", error);
    }
  }, []);
  
  const clearApiKey = useCallback(() => {
    try {
      window.localStorage.removeItem(API_KEY);
      setApiKey(null);
    } catch (error) {
      console.error("Failed to remove API key from localStorage", error);
    }
  }, []);

  const value = { apiKey, setApiKey: saveApiKey, clearApiKey, loading };

  return React.createElement(ApiKeyContext.Provider, { value: value }, children);
}

export function useApiKey() {
  const context = useContext(ApiKeyContext);
  if (context === undefined) {
    throw new Error('useApiKey must be used within a ApiKeyProvider');
  }
  return context;
}
