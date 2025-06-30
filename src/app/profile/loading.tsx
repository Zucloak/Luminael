
import { Header } from '@/components/layout/Header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function Loading() {
  return (
    <div className={cn("theme-container min-h-screen flex flex-col transition-colors duration-1000")}>
      <Header isHellBound={false} />
      <main className="container mx-auto p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-2xl mx-auto w-full">
          <CardHeader>
            <Skeleton className="h-8 w-3/5" />
            <Skeleton className="h-4 w-4/5" />
          </CardHeader>
          <CardContent className="space-y-8 pt-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </main>
      <footer className="text-center p-4 text-sm text-muted-foreground">
        <p>
          A Prototype from <a href="https://synappse.vercel.app/" target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-foreground">SYNAPPSE</a> | Developer/CEO: Mr. K. M.
        </p>
      </footer>
    </div>
  );
}
