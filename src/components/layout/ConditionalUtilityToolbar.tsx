"use client";

import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/use-user';
import { UtilityToolbar } from './UtilityToolbar';

export function ConditionalUtilityToolbar() {
  const { user } = useUser();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || !user?.utilityToolsEnabled) {
    return null;
  }

  return <UtilityToolbar />;
}
