"use client";

import { useUser } from '@/hooks/use-user';
import { UtilityToolbar } from './UtilityToolbar';

export function ConditionalUtilityToolbar() {
  const { user } = useUser();

  if (!user?.utilityToolsEnabled) {
    return null;
  }

  return <UtilityToolbar />;
}
