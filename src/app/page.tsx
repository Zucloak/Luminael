"use client";

import { useState } from 'react';
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

type View = 'setup' | 'generating' | 'quiz' | 'results';

export default function Home() {
  const [view, setView] = useState<View>('setup');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [timer, setTimer] = useState<number>(0);
  const { isHellBound, setIsHellBound } = useTheme();
  const { toast } = useToast();
  const { user } = useUser();
  const { apiKey } = useApiKey();

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
    
    setTimer(values.timerPerQuestion || 0);
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

        if (!result || !result.quiz || result.quiz.questions.length === 0) {
          throw new Error(`AI failed to generate questions in batch starting at ${i}.`);
        }
        
        const newQuestions = result.quiz.questions;
        allQuestions = [...allQuestions, ...newQuestions];
        existingQuestionTitles = [...existingQuestionTitles, ...newQuestions.map(q => q.question)];
      }

      setGenerationProgress(prev => ({ ...prev, current: totalQuestions }));
      setQuiz({ questions: allQuestions });
      setUserAnswers({});
      setView('quiz');

    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error Generating Quiz",
        description: "Something went wrong. The AI might be busy, or the content was unsuitable. Please try again with fewer questions or different content.",
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
    setView('setup');
  };

  const handleRetake = () => {
    setUserAnswers({});
    setView('quiz');
  };

  const renderContent = () => {
    switch (view) {
      case 'generating':
        const progressPercentage = generationProgress.total > 0 ? (generationProgress.current / generationProgress.total) * 100 : 0;
        if (isHellBound) {
          return (
            <div className="text-center space-y-6 w-full max-w-2xl">
              <PulsingCoreRed className="h-24 w-24 mx-auto" />
              <h2 className="text-3xl font-headline font-bold text-destructive animate-pulse">Forging Your Trial...</h2>
              <LoadingQuotes />
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
            <p className="text-muted-foreground">The AI is working hard. This might take a moment, especially for large quizzes.</p>
            <Progress 
              value={progressPercentage} 
              className="w-full"
              indicatorClassName="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-[length:200%_200%] animate-progress-fluid"
            />
            <p className="text-sm font-medium">Generated {generationProgress.current} of {generationProgress.total} questions</p>
          </div>
        );
      case 'quiz':
        return quiz && <QuizInterface quiz={quiz} timer={timer} onSubmit={handleQuizSubmit} />;
      case 'results':
        return quiz && <QuizResults quiz={quiz} answers={userAnswers} onRestart={handleRestart} onRetake={handleRetake} user={user} />;
      case 'setup':
      default:
        return <QuizSetup onQuizStart={(fileContent, values) => handleQuizStart(fileContent, values)} isGenerating={view === 'generating'} isHellBound={isHellBound} onHellBoundToggle={setIsHellBound} />;
    }
  };

  return (
    <div className={cn("theme-container min-h-screen flex flex-col bg-background transition-colors duration-1000", isHellBound && "hell-bound")}>
      <Header isHellBound={isHellBound} />
      <main className="flex-grow container mx-auto p-4 md:p-8 flex items-center justify-center">
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
