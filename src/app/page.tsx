
"use client";

import { useState, useEffect } from 'react';
import type { Quiz, UserProfile, Question } from '@/lib/types';
import { generateQuiz, GenerateQuizInput } from '@/ai/flows/generate-quiz';
import { generateHellBoundQuiz, GenerateHellBoundQuizInput } from '@/ai/flows/generate-hell-bound-quiz';
import { useToast } from "@/hooks/use-toast";
import { Header } from '@/components/layout/Header';
import { QuizSetup } from '@/components/quiz/QuizSetup';
import { QuizInterface } from '@/components/quiz/QuizInterface';
import { QuizResults } from '@/components/quiz/QuizResults';
import { useUser } from '@/hooks/use-user';
import { Progress } from '@/components/ui/progress';
import { useApiKey } from '@/hooks/use-api-key';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/use-theme';
import { PulsingCore } from '@/components/common/PulsingCore';
import { PulsingCoreRed } from '@/components/common/PulsingCoreRed';
import { LoadingQuotes } from '@/components/quiz/LoadingQuotes';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PatchNotesDialog } from '@/components/layout/PatchNotesDialog';
import { patchNotes, LATEST_VERSION } from '@/lib/patch-notes';
import { useQuizSetup } from '@/hooks/use-quiz-setup';

const LAST_SEEN_VERSION_KEY = 'luminael_last_seen_version';

type View = 'setup' | 'generating' | 'quiz' | 'results';

export default function Home() {
  const [view, setView] = useState<View>('setup');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [timer, setTimer] = useState<number>(0);
  const { isHellBound, setIsHellBound, loading: themeLoading } = useTheme();
  const { toast } = useToast();
  const { user } = useUser();
  const { apiKey, loading: apiKeyLoading, incrementUsage } = useApiKey();
  const [isPatchNotesOpen, setIsPatchNotesOpen] = useState(false);
  const { clearQuizSetup } = useQuizSetup();

  const isLoading = themeLoading || apiKeyLoading;

  useEffect(() => {
    if (isLoading) return; // Don't check until other hooks are ready
    try {
      const lastSeenVersion = window.localStorage.getItem(LAST_SEEN_VERSION_KEY);
      if (lastSeenVersion !== LATEST_VERSION) {
        setIsPatchNotesOpen(true);
      }
    } catch (error) {
        console.error("Could not read from localStorage", error);
        // Fallback to showing patch notes if storage is inaccessible
        setIsPatchNotesOpen(true);
    }
  }, [isLoading]);

  const handleClosePatchNotes = () => {
    try {
        window.localStorage.setItem(LAST_SEEN_VERSION_KEY, LATEST_VERSION);
    } catch (error) {
        console.error("Could not write to localStorage", error);
    }
    setIsPatchNotesOpen(false);
  };

  const handleQuizStart = async (fileContent: string, values: any) => {
    if (!apiKey) {
      toast({
        variant: "destructive",
        title: "API Key Required",
        description: "Please set your Gemini API key in the header before generating a quiz.",
      });
      return;
    }

    const BATCH_SIZE = 5;
    const totalQuestions = values.numQuestions;
    
    const timerToSet = values.timerEnabled ? values.timerPerQuestion : 0;
    setTimer(timerToSet || 0);
    setView('generating');
    setGenerationProgress({ current: 0, total: totalQuestions });

    let allQuestions: Question[] = [];
    let existingQuestionTitles: string[] = [];

    try {
      for (let i = 0; i < totalQuestions; i += BATCH_SIZE) {
        const questionsInBatch = Math.min(BATCH_SIZE, totalQuestions - i);
        setGenerationProgress(prev => ({ ...prev, current: i }));

        const generatorFn = isHellBound ? generateHellBoundQuiz : generateQuiz;
        
        let params: Omit<GenerateQuizInput, 'apiKey'> | Omit<GenerateHellBoundQuizInput, 'apiKey'>;
        if (isHellBound) {
          params = {
            fileContent,
            numQuestions: questionsInBatch,
            existingQuestions: existingQuestionTitles,
          };
        } else {
          params = {
            content: fileContent,
            numQuestions: questionsInBatch,
            difficulty: values.difficulty || 'Medium',
            questionFormat: values.questionFormat || 'multipleChoice',
            existingQuestions: existingQuestionTitles,
          };
        }
        
        const result = await (generatorFn as any)({...params, apiKey});
        incrementUsage(); // Increment for the generation call

        if (result && result.quiz && Array.isArray(result.quiz.questions)) {
          const newQuestions = result.quiz.questions.filter(q => q && q.question && q.question.trim() !== '');
          allQuestions = [...allQuestions, ...newQuestions];
          existingQuestionTitles = [...existingQuestionTitles, ...newQuestions.map(q => q.question)];
        } else {
            console.warn(`AI returned an invalid response or no questions in batch starting at ${i}.`);
        }
      }

      if (allQuestions.length === 0) {
        throw new Error("The AI failed to generate any valid questions. Please check your content or settings and try again.");
      }
      
      if (allQuestions.length < totalQuestions) {
        toast({
            title: "Quiz Adjusted",
            description: `The AI generated ${allQuestions.length} valid questions instead of the requested ${totalQuestions}.`,
        });
      }

      setGenerationProgress(prev => ({ ...prev, current: totalQuestions }));
      setQuiz({ questions: allQuestions });
      setUserAnswers({});
      setView('quiz');

    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Something went wrong. The AI might be busy, or the content was unsuitable. Please try again.";
      toast({
        variant: "destructive",
        title: "Error Generating Quiz",
        description: message,
      });
      setView('setup');
    } finally {
      setGenerationProgress({ current: 0, total: 0 });
    }
  };

  const handleQuizSubmit = (answers: Record<number, string>) => {
    setUserAnswers(answers);
    setView('results');
  };

  const handleRestart = () => {
    setQuiz(null);
    setUserAnswers({});
    setTimer(0);
    clearQuizSetup();
    setView('setup');
  };

  const handleRetake = () => {
    setUserAnswers({});
    setView('quiz');
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
              <p className="text-sm font-medium">Conjured {generationProgress.current} of {generationProgress.total} torments</p>
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
          </div>
        );
      case 'quiz':
        return quiz && <QuizInterface quiz={quiz} timer={timer} onSubmit={handleQuizSubmit} onExit={handleRestart} isHellBound={isHellBound} />;
      case 'results':
        return quiz && <QuizResults quiz={quiz} answers={userAnswers} onRestart={handleRestart} onRetake={handleRetake} user={user} />;
      case 'setup':
      default:
        return <QuizSetup onQuizStart={(fileContent, values) => handleQuizStart(fileContent, values)} isGenerating={view === 'generating'} isHellBound={isHellBound} onHellBoundToggle={setIsHellBound} />;
    }
  };

  return (
    <div className={cn("theme-container min-h-screen flex flex-col transition-colors duration-1000", isHellBound && "hell-bound")}>
      <Header isHellBound={isHellBound} />
      <PatchNotesDialog
        isOpen={isPatchNotesOpen}
        onClose={handleClosePatchNotes}
        patch={patchNotes[0]}
      />
      <main className="flex-grow container mx-auto p-4 md:p-8 flex items-start lg:items-center justify-center">
        {renderContent()}
      </main>
      <footer className="text-center p-4 text-sm text-muted-foreground">
        <p>
          A Prototype from <a href="https://synappse.vercel.app/" target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-foreground">SYNAPPSE</a> | Developer/CEO: Mr. K. M.
        </p>
      </footer>
    </div>
  );
}
