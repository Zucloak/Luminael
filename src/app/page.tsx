"use client";

import { useState } from 'react';
import type { Quiz, UserProfile } from '@/lib/types';
import { generateQuiz } from '@/ai/flows/generate-quiz';
import { generateHellBoundQuiz } from '@/ai/flows/generate-hell-bound-quiz';
import { useToast } from "@/hooks/use-toast";
import { Header } from '@/components/layout/Header';
import { QuizSetup } from '@/components/quiz/QuizSetup';
import { QuizInterface } from '@/components/quiz/QuizInterface';
import { QuizResults } from '@/components/quiz/QuizResults';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/hooks/use-user';

type View = 'setup' | 'generating' | 'quiz' | 'results';

export default function Home() {
  const [view, setView] = useState<View>('setup');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const { toast } = useToast();
  const { user } = useUser();

  const handleQuizStart = async (fileContent: string, values: any, isHellBound: boolean) => {
    setView('generating');
    try {
      let result;
      if (isHellBound) {
        result = await generateHellBoundQuiz({
          fileContent,
          numQuestions: values.numQuestions,
        });
      } else {
        result = await generateQuiz({
          content: fileContent,
          numQuestions: values.numQuestions,
          topics: values.topics || 'general',
          difficulty: values.difficulty || 'Medium',
          questionFormat: values.questionFormat || 'multipleChoice',
        });
      }

      if (!result || !result.quiz || result.quiz.questions.length === 0) {
        throw new Error("AI failed to generate a quiz or the quiz has no questions.");
      }

      setQuiz(result.quiz);
      setUserAnswers({});
      setView('quiz');

    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error Generating Quiz",
        description: "Something went wrong. The AI might be busy, or the content was unsuitable. Please try again.",
      });
      setView('setup');
    }
  };

  const handleQuizSubmit = (answers: Record<number, string>) => {
    setUserAnswers(answers);
    setView('results');
  };

  const handleRestart = () => {
    setQuiz(null);
    setUserAnswers({});
    setView('setup');
  };

  const renderContent = () => {
    switch (view) {
      case 'generating':
        return (
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-headline font-bold">Generating your masterpiece...</h2>
            <p className="text-muted-foreground">The AI is thinking hard. This might take a moment.</p>
            <div className="w-full max-w-3xl mx-auto space-y-8 mt-8">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        );
      case 'quiz':
        return quiz && <QuizInterface quiz={quiz} onSubmit={handleQuizSubmit} />;
      case 'results':
        return quiz && <QuizResults quiz={quiz} answers={userAnswers} onRestart={handleRestart} user={user} />;
      case 'setup':
      default:
        return <QuizSetup onQuizStart={handleQuizStart} isGenerating={view === 'generating'} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-8 flex items-center justify-center">
        {renderContent()}
      </main>
      <footer className="text-center p-4 text-sm text-muted-foreground">
        <p>Powered by Firebase and Genkit. Have fun studying!</p>
      </footer>
    </div>
  );
}
