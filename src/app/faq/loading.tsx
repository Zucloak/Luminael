
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function Loading() {
  return (
    <div className="relative w-full max-w-3xl mx-auto py-8">
      <Card className="w-full relative shadow-lg">
        <CardHeader className="text-center items-center">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-8 w-64 mt-4" />
            <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent className="p-6 space-y-4">
            <div className="border-b pb-4">
                <Skeleton className="h-6 w-full" />
            </div>
            <div className="border-b pb-4">
                <Skeleton className="h-6 w-full" />
            </div>
            <div className="border-b pb-4">
                <Skeleton className="h-6 w-full" />
            </div>
             <div className="border-b pb-4">
                <Skeleton className="h-6 w-full" />
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
