"use client";

import { useState, useEffect, useCallback } from 'react';

const API_KEY = 'luminael_gemini_api_key';

export function useApiKey() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(API_KEY);
      if (item) {
        setApiKey(item);
      }
    } catch (error) {
      console.error("Failed to parse API key from localStorage", error);
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

  return { apiKey, setApiKey: saveApiKey, clearApiKey, loading };
}
