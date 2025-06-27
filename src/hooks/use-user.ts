"use client";

import { useState, useEffect } from 'react';
import type { UserProfile } from '@/lib/types';

const USER_PROFILE_KEY = 'quizmaster_user_profile';

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(USER_PROFILE_KEY);
      if (item) {
        setUser(JSON.parse(item));
      }
    } catch (error) {
      console.error("Failed to parse user profile from localStorage", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveUser = (profile: UserProfile) => {
    try {
      window.localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
      setUser(profile);
    } catch (error) {
      console.error("Failed to save user profile to localStorage", error);
    }
  };
  
  const clearUser = () => {
    try {
      window.localStorage.removeItem(USER_PROFILE_KEY);
      setUser(null);
    } catch (error) {
      console.error("Failed to remove user profile from localStorage", error);
    }
  };

  return { user, saveUser, clearUser, loading };
}
