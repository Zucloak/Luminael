"use client";

import { usePathname } from 'next/navigation';
import { ConditionalUtilityToolbar } from '@/components/layout/ConditionalUtilityToolbar';
import WhitepaperPageContent from './WhitepaperPageContent';

export default function WhitepaperPage() {
  const pathname = usePathname();
  const isWhitepaperPage = pathname === '/whitepaper';

  return (
    <>
      <WhitepaperPageContent />
      {!isWhitepaperPage && <ConditionalUtilityToolbar />}
    </>
  );
}
