"use client";

import Link from 'next/link';
import { User, Home, Maximize, Minimize } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiKeyDialog } from './ApiKeyDialog';
import { cn } from '@/lib/utils';
import { useFullscreen } from '@/hooks/use-fullscreen';

export function Header({ isHellBound = false }: { isHellBound?: boolean }) {
  const { user, loading } = useUser();
  const { isFullscreen, toggleFullscreen, isSupported } = useFullscreen();

  return (
    <header className="py-4 px-4 md:px-8 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex flex-col">
          <Link href="/" className="flex items-center gap-2">
            <h1 className="text-2xl font-headline font-bold text-foreground">
              Luminael
            </h1>
          </Link>
          <a
            href="https://synappse.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-[#6A0DAD]"
          >
            BY SYNAPPSE
          </a>
        </div>
        <div className="flex items-center gap-4">
          {loading ? (
            <Skeleton className="h-10 w-24 rounded-md" />
          ) : user ? (
            <span className={cn(
              "font-semibold text-sm hidden md:inline",
              isHellBound ? "text-accent" : "text-foreground"
            )}>Welcome, {user.name}</span>
          ) : null}
          <Button asChild variant="outline" size="icon" aria-label="Home" className={cn(isHellBound && "text-foreground hover:text-accent-foreground")}>
            <Link href="/">
              <Home className="h-5 w-5" />
            </Link>
          </Button>
          {isSupported && (
            <Button variant="outline" size="icon" aria-label="Toggle Fullscreen" onClick={toggleFullscreen} className={cn(isHellBound && "text-foreground hover:text-accent-foreground")}>
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </Button>
          )}
          <ApiKeyDialog isHellBound={isHellBound} />
          <Button asChild variant="outline" size="icon" aria-label="User Profile" className={cn(isHellBound && "text-foreground hover:text-accent-foreground")}>
            <Link href="/profile">
              <User className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
