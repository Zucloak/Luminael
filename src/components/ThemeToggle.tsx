'use client';

import * as React from 'react';
import {Moon, Sun, Flame} from 'lucide-react';
import {useTheme} from 'next-themes';

import {Button} from '@/components/ui/button';

export function ThemeToggle() {
  const {theme, setTheme} = useTheme();
  const [audio, setAudio] = React.useState<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    setAudio(new Audio('/hell-bound.wav'));
  }, []);

  const toggleHellBound = () => {
    const newTheme = theme === 'hell-bound' ? 'dark' : 'hell-bound';
    setTheme(newTheme);
    if (newTheme === 'hell-bound' && audio) {
      audio.play();
    }
  };

  const toggleLightDark = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={toggleLightDark}>
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={toggleHellBound}
        className={
          theme === 'hell-bound'
            ? 'bg-red-500/20 border-red-500 text-red-500 hover:bg-red-500/30 hover:text-red-500'
            : ''
        }
      >
        <Flame className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Toggle Hell Bound mode</span>
      </Button>
    </div>
  );
}
