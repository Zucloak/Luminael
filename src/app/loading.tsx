
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function Loading() {
  return (
    <div className={cn("theme-container min-h-screen flex flex-col transition-colors duration-1000")}>
      <Header isHellBound={false} />
      <main className="flex-grow container mx-auto p-4 md:p-8 flex items-start lg:items-center justify-center">
        <Card className="w-full max-w-3xl mx-auto">
          <CardHeader className="text-center items-center">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-10 w-48 mt-4" />
            <Skeleton className="h-4 w-64 mt-2" />
            <Skeleton className="h-4 w-full mt-2" />
          </CardHeader>
          <CardContent className="space-y-8 pt-6">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-12 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <div className="p-4 border rounded-md space-y-4 bg-background/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-12 w-full" />
          </CardFooter>
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
