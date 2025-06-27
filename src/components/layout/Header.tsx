"use client";

import Link from 'next/link';
import { User, GraduationCap } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function Header() {
  const { user, loading } = useUser();

  return (
    <header className="py-4 px-4 md:px-8 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <GraduationCap className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-headline font-bold text-foreground">
            QuizMaster AI
          </h1>
        </Link>
        <div className="flex items-center gap-4">
          {loading ? (
            <Skeleton className="h-10 w-24 rounded-md" />
          ) : user ? (
            <span className="font-semibold text-sm hidden md:inline">Welcome, {user.name}</span>
          ) : null}
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
