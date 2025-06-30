
"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getPastQuizzes, deletePastQuiz } from '@/lib/indexed-db';
import type { PastQuiz } from '@/lib/types';
import { Bookmark, FileText, Calendar, Percent, Eye, RotateCw, Trash2, Frown, Play } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

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

const TAG_COLORS: { [key: string]: string } = {
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  gray: 'bg-gray-500',
};

export default function SavedQuizzesPage() {
    const { isHellBound, loading: themeLoading } = useTheme();
    const [savedQuizzes, setSavedQuizzes] = useState<PastQuiz[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const fetchQuizzes = useCallback(async () => {
        setIsLoading(true);
        try {
            const quizzes = await getPastQuizzes();
            setSavedQuizzes(quizzes);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not load saved quizzes from your browser database.',
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchQuizzes();
    }, [fetchQuizzes]);

    const handleDelete = async (id: number) => {
        try {
            await deletePastQuiz(id);
            toast({
                title: 'Quiz Deleted',
                description: 'The quiz has been removed from your saved library.',
            });
            fetchQuizzes(); // Refresh the list
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not delete the quiz from your library.',
            });
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };
    
    return (
        <div className={cn("theme-container min-h-screen flex flex-col transition-colors duration-1000", isHellBound && "hell-bound")}>
            <Header isHellBound={isHellBound} />
            <main className="flex-grow container mx-auto p-4 md:p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-4 mb-8">
                        <Bookmark className="h-10 w-10 text-primary" />
                        <div>
                            <h1 className="text-3xl md:text-4xl font-headline font-bold">Saved Quizzes</h1>
                            <p className="text-muted-foreground">Review, retake, or delete your saved quizzes. All data is stored securely on your device.</p>
                        </div>
                    </div>

                    {isLoading || themeLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <SavedQuizSkeleton />
                           <SavedQuizSkeleton />
                        </div>
                    ) : savedQuizzes.length === 0 ? (
                        <Card className="text-center py-12 px-6">
                            <CardHeader>
                                <Frown className="h-16 w-16 mx-auto text-muted-foreground" />
                                <CardTitle className="mt-4">No Quizzes Saved</CardTitle>
                                <CardDescription>
                                    You haven't saved any quizzes yet. After completing a quiz, you'll have the option to save it here.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button asChild>
                                    <Link href="/">Create a Quiz</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {savedQuizzes.map((pq) => (
                                <Card key={pq.id} className="flex flex-col">
                                    <CardHeader>
                                        <CardTitle className="font-semibold flex items-start justify-between gap-2">
                                            <div className="flex items-start gap-2 min-w-0">
                                                <FileText className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                                                <span className="truncate" title={pq.title}>{pq.title}</span>
                                            </div>
                                            {pq.color && <div className={cn("h-3 w-3 rounded-full flex-shrink-0 mt-1.5", TAG_COLORS[pq.color] || 'bg-gray-500')} title={`Color tag: ${pq.color}`} />}
                                        </CardTitle>
                                        <CardDescription className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" /> {formatDate(pq.date)}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow grid grid-cols-2 gap-4">
                                        {pq.status === 'completed' && pq.score ? (
                                            <>
                                                <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/50">
                                                    <span className="text-sm text-muted-foreground">Score</span>
                                                    <span className="text-2xl font-bold">{pq.score.score}/{pq.score.total}</span>
                                                </div>
                                                <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/50">
                                                    <span className="text-sm text-muted-foreground">Percentage</span>
                                                    <span className="text-2xl font-bold flex items-center">{pq.score.percentage}<Percent className="h-5 w-5 ml-1"/></span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="col-span-2 flex flex-col items-center justify-center p-4 rounded-lg bg-muted/50">
                                                <span className="text-sm text-muted-foreground">In Progress</span>
                                                <span className="text-2xl font-bold">{Object.keys(pq.userAnswers).length} / {pq.quiz.questions.length} Answered</span>
                                            </div>
                                        )}
                                    </CardContent>
                                    <CardFooter className="gap-2">
                                        {pq.status === 'completed' ? (
                                            <>
                                                <Button asChild className="flex-1" variant="outline">
                                                    <Link href={`/?results=${pq.id}`}><Eye className="mr-2 h-4 w-4" />Review</Link>
                                                </Button>
                                                <Button asChild className="flex-1">
                                                    <Link href={`/?retake=${pq.id}`}><RotateCw className="mr-2 h-4 w-4" />Retake</Link>
                                                </Button>
                                            </>
                                        ) : (
                                            <Button asChild className="flex-1">
                                                <Link href={`/?resume=${pq.id}`}><Play className="mr-2 h-4 w-4" />Resume</Link>
                                            </Button>
                                        )}
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="icon">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete this quiz from your browser.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(pq.id)}>Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </main>
            <footer className="text-center p-4 text-sm text-muted-foreground">
                <p>
                    A Prototype from <a href="https://synappse.vercel.app/" target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-foreground">SYNAPPSE</a> | Developer/CEO: Mr. K. M.
                </p>
            </footer>
        </div>
    );
}
