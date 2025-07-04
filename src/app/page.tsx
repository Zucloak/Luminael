
"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { QuizSetup } from '@/components/quiz/QuizSetup';
import { QuizInterface } from '@/components/quiz/QuizInterface';
import { QuizResults } from '@/components/quiz/QuizResults';
import { useUser } from '@/hooks/use-user';
import { Progress } from '@/components/ui/progress';
import { useApiKey } from '@/hooks/use-api-key';
import { useTheme } from '@/hooks/use-theme';
import { PulsingCore } from '@/components/common/PulsingCore';
import { PulsingCoreRed } from '@/components/common/PulsingCoreRed';
import { LoadingQuotes } from '@/components/quiz/LoadingQuotes';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PatchNotesDialog } from '@/components/layout/PatchNotesDialog';
import { patchNotes, LATEST_VERSION } from '@/lib/patch-notes';
import { useQuizSetup } from '@/hooks/use-quiz-setup';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

const LAST_SEEN_VERSION_KEY = 'luminael_last_seen_version';

export default function Home() {
  const { 
    view, 
    quiz, 
    userAnswers, 
    generationProgress, 
    timer, 
    startQuiz, 
    submitQuiz, 
    restartQuiz, 
    retakeQuiz,
    isGenerating,
    cancelGeneration,
    loadQuizFromHistory,
    processedFiles,
    isEcoModeActive, // Destructure isEcoModeActive
  } = useQuizSetup();

  const searchParams = useSearchParams();
  const router = useRouter();
  
  const { isHellBound, setIsHellBound, loading: themeLoading } = useTheme();
  const { user } = useUser();
  const { loading: apiKeyLoading } = useApiKey();
  const [isPatchNotesOpen, setIsPatchNotesOpen] = useState(false);

  const isLoading = themeLoading || apiKeyLoading;

  useEffect(() => {
    if (isLoading) return;
    try {
      const lastSeenVersion = window.localStorage.getItem(LAST_SEEN_VERSION_KEY);
      if (lastSeenVersion !== LATEST_VERSION) {
        setIsPatchNotesOpen(true);
      }
    } catch (error) {
        console.error("Could not read from localStorage", error);
        setIsPatchNotesOpen(true);
    }
  }, [isLoading]);

  useEffect(() => {
    const retakeId = searchParams.get('retake');
    const resultsId = searchParams.get('results');
    const resumeId = searchParams.get('resume');

    let id: string | null = null;
    let mode: 'retake' | 'results' | 'resume' | null = null;
    
    if (retakeId) {
        id = retakeId;
        mode = 'retake';
    } else if (resultsId) {
        id = resultsId;
        mode = 'results';
    } else if (resumeId) {
        id = resumeId;
    mode = 'resume';
    }

    if (id && mode && loadQuizFromHistory) {
      loadQuizFromHistory(Number(id), mode);
      // Clean up URL to prevent re-triggering on reload
      router.replace('/', { scroll: false }); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, loadQuizFromHistory]);

  const handleClosePatchNotes = () => {
    try {
        window.localStorage.setItem(LAST_SEEN_VERSION_KEY, LATEST_VERSION);
    } catch (error) {
        console.error("Could not write to localStorage", error);
    }
    setIsPatchNotesOpen(false);
  };

  const renderContent = () => {
    if (isLoading && view === 'setup') {
      return (
        <Card className="w-full max-w-3xl mx-auto animate-in fade-in-50 duration-500">
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
      );
    }
    const combinedContent = processedFiles.map(f => f.content).join('\n\n---\n\n');

    switch (view) {
      case 'generating':
        const progressPercentage = generationProgress.total > 0 ? (generationProgress.current / generationProgress.total) * 100 : 0;
        if (isHellBound) {
          return (
            <div className="text-center space-y-6 w-full max-w-2xl">
              <PulsingCoreRed className="h-24 w-24 mx-auto" />
              <h2 className="text-3xl font-headline font-bold text-destructive animate-pulse">Forging Your Trial...</h2>
              <LoadingQuotes mode="hellBound" />
              <Progress 
                value={progressPercentage} 
                className="w-full bg-destructive/30"
                indicatorClassName="bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 bg-[length:200%_200%] animate-progress-fluid"
              />
              <p className="text-sm font-medium text-muted-foreground">Conjured {generationProgress.current} of {generationProgress.total} torments</p>
              <div className="pt-4">
                <Button variant="destructive" onClick={cancelGeneration}>
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel Generation
                </Button>
              </div>
            </div>
          );
        }
        return (
          <div className="text-center space-y-6 w-full max-w-2xl">
            <PulsingCore className="h-24 w-24 mx-auto" />
            <h2 className="text-2xl font-headline font-bold">Generating your masterpiece...</h2>
            <LoadingQuotes mode="normal" />
            <Progress 
              value={progressPercentage} 
              className="w-full"
              indicatorClassName="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-[length:200%_200%] animate-progress-fluid"
            />
            <p className="text-sm font-medium">Generated {generationProgress.current} of {generationProgress.total} questions</p>
            <div className="pt-4">
                <Button variant="outline" onClick={cancelGeneration}>
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel Generation
                </Button>
            </div>
          </div>
        );
      case 'quiz':
        return quiz && <QuizInterface quiz={quiz} timer={timer} onSubmit={submitQuiz} onExit={restartQuiz} isHellBound={isHellBound} sourceContent={combinedContent} />;
      case 'results':
        return quiz && <QuizResults
                         quiz={quiz}
                         answers={userAnswers}
                         onRestart={restartQuiz}
                         onRetake={retakeQuiz}
                         user={user}
                         sourceContent={combinedContent}
                         isEcoModeActive={isEcoModeActive} // Pass isEcoModeActive
                       />;
      case 'setup':
      default:
        return <QuizSetup onQuizStart={startQuiz} isGenerating={isGenerating} isHellBound={isHellBound} onHellBoundToggle={setIsHellBound} />;
    }
  };

  return (
    <>
      <PatchNotesDialog
        isOpen={isPatchNotesOpen}
        onClose={handleClosePatchNotes}
        patch={patchNotes[0]}
      />
      {renderContent()}
    </>
  );
}
