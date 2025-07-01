'use client';
import {Flame, Lightbulb} from 'lucide-react';
import {ThemeToggle} from './ThemeToggle';
import Link from 'next/link';
import {useTheme} from 'next-themes';
import {useEffect, useState} from 'react';

export function Header() {
  const {theme} = useTheme();
  const [isHellBound, setIsHellBound] = useState(false);
  const [showTitle, setShowTitle] = useState(false);

  useEffect(() => {
    setIsHellBound(theme === 'hell-bound');
  }, [theme]);

  useEffect(() => {
    if (isHellBound) {
      setShowTitle(true);
      const timer = setTimeout(() => {
        setShowTitle(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isHellBound]);

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 flex justify-between items-center h-16">
        <Link href="/" className="flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Luminael</h1>
          <span className="text-xs font-mono bg-primary/10 text-primary/80 px-1 py-0.5 rounded">
            BY SYNAPSE
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <nav className="hidden md:flex gap-4">
            <Link href="/faq" className="text-sm font-medium hover:underline">
              FAQ
            </Link>
            <Link href="/terms" className="text-sm font-medium hover:underline">
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              className="text-sm font-medium hover:underline"
            >
              Privacy Policy
            </Link>
          </nav>
          <ThemeToggle />
        </div>
      </div>
       {isHellBound && (
        <div
          className={`text-center py-2 transition-opacity duration-1000 ease-in-out ${
            showTitle ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <h2 className="text-2xl font-bold text-red-500 animate-pulse">
            <Flame className="inline-block w-6 h-6 mb-1 mr-2" />
            HELL BOUND!
            <Flame className="inline-block w-6 h-6 mb-1 ml-2" />
          </h2>
          <p className="text-sm text-muted-foreground">A smooth to any device, fluidly animated and sophisticated look</p>
        </div>
      )}
    </header>
  );
}
