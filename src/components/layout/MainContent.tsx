
"use client";

import Link from 'next/link';
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { Separator } from '../ui/separator';

export function MainContent({ children }: { children: React.ReactNode }) {
  const { isHellBound, loading: themeLoading } = useTheme();

  // Prevents a flash of unstyled content on initial load
  if (themeLoading) {
    return (
      <main className="flex-grow container mx-auto p-4 md:p-8 flex items-start lg:items-center justify-center">
        {children}
      </main>
    )
  }

  return (
    <div className="theme-container min-h-screen-minus-header flex flex-col transition-colors duration-1000">
       {isHellBound && (
            <div className="pointer-events-none fixed top-[81px] left-0 right-0 z-40 flex justify-center" aria-hidden="true">
                <h2 className="hell-bound-title">HELL BOUND</h2>
            </div>
        )}
      <main className="flex-grow container mx-auto p-4 md:p-8 flex items-start lg:items-center justify-center">
        {children}
      </main>
      <footer className="text-center p-4 text-sm text-muted-foreground">
        <div className="container mx-auto flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 mb-2">
            <Link href="/faq" className="font-semibold underline hover:text-foreground">FAQ</Link>
            <Separator orientation="vertical" className="hidden sm:block h-4" />
            <Link href="/terms" className="font-semibold underline hover:text-foreground">Terms of Service</Link>
            <Separator orientation="vertical" className="hidden sm:block h-4" />
            <Link href="/privacy" className="font-semibold underline hover:text-foreground">Privacy Policy</Link>
            <Separator orientation="vertical" className="hidden sm:block h-4" />
            <a href="/whitepaper" target="_blank" rel="noopener noreferrer" className="underline hover:underline">Whitepaper</a>
        </div>
        <p className="mt-2">
          A Prototype from <a href="https://synappse.vercel.app/" target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-foreground">SYNAPPSE</a> | Developer/CEO: Ken Mosquera
        </p>
        <p className="mt-1">
          &copy; 2025 Luminael AI. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
}
