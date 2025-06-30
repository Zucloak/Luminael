
"use client";

import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

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
    <div className={cn("theme-container min-h-screen-minus-header flex flex-col transition-colors duration-1000", isHellBound && "hell-bound")}>
      <main className="flex-grow container mx-auto p-4 md:p-8 flex items-start lg:items-center justify-center">
        {children}
      </main>
      <footer className="text-center p-4 text-sm text-muted-foreground">
        <p>
          A Prototype from <a href="https://synappse.vercel.app/" target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-foreground">SYNAPPSE</a> | Developer/CEO: Mr. K. M.
        </p>
      </footer>
    </div>
  );
}
