"use client";

import Link from 'next/link';
import { User } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiKeyDialog } from './ApiKeyDialog';

export function Header() {
  const { user, loading } = useUser();

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
            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            BY SYNAPPSE
          </a>
        </div>
        <div className="flex items-center gap-4">
          {loading ? (
            <Skeleton className="h-10 w-24 rounded-md" />
          ) : user ? (
            <span className="font-semibold text-sm hidden md:inline">Welcome, {user.name}</span>
          ) : null}
          <ApiKeyDialog />
          <Link href="/profile" passHref>
            <Button variant="outline" size="icon" aria-label="User Profile">
              <User className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
