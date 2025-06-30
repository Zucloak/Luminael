
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Bookmark } from 'lucide-react';

function SavedQuizSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-24" />
                </div>
                <div className="space-y-1">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-24" />
                </div>
            </CardContent>
            <CardFooter className="gap-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-12" />
            </CardFooter>
        </Card>
    )
}

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
            <Bookmark className="h-10 w-10 text-primary" />
            <div>
                <h1 className="text-3xl md:text-4xl font-headline font-bold">Saved Quizzes</h1>
                <p className="text-muted-foreground">Review, retake, or delete your saved quizzes. All data is stored securely on your device.</p>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <SavedQuizSkeleton />
           <SavedQuizSkeleton />
        </div>
    </div>
  );
}
