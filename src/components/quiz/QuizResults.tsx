"use client";

import type { Quiz, UserProfile, Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Check, X, Award, RotateCw, Pencil, Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from '../common/MarkdownRenderer';

interface QuizResultsProps {
  quiz: Quiz;
  answers: Record<number, string>;
  onRestart: () => void;
  onRetake: () => void;
  user: UserProfile | null;
}

type Result = (Question & { userAnswer: string; isCorrect: boolean | null });

export function QuizResults({ quiz, answers, onRestart, onRetake, user }: QuizResultsProps) {
  const { score, total, results, percentage } = useMemo(() => {
    let correctCount = 0;
    const multipleChoiceQuestions = quiz.questions.filter(q => q.questionType === 'multipleChoice');
    const totalMultipleChoice = multipleChoiceQuestions.length;

    const detailedResults: Result[] = quiz.questions.map((q, index) => {
      const userAnswer = answers[index] || 'No answer';
      if (q.questionType === 'multipleChoice') {
        const correctAnswer = q.answer;
        const isCorrect = userAnswer === correctAnswer;
        if (isCorrect) {
          correctCount++;
        }
        return { ...q, userAnswer, isCorrect };
      }
      return { ...q, userAnswer, isCorrect: null };
    });
    
    const calculatedPercentage = totalMultipleChoice > 0 ? Math.round((correctCount / totalMultipleChoice) * 100) : 0;

    return {
      score: correctCount,
      total: totalMultipleChoice,
      results: detailedResults,
      percentage: calculatedPercentage,
    };
  }, [quiz, answers]);

  const getResultMessage = (percentage: number) => {
    if (total <= 0) return "Quiz Reviewed";
    if (percentage >= 90) return "Excellent Work!";
    if (percentage >= 70) return "Great Job!";
    if (percentage >= 50) return "Good Effort!";
    return "Keep Reviewing!";
  };

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-2xl animate-in fade-in-50 duration-500">
      <CardHeader className="text-center items-center">
        <div className="bg-primary/10 p-4 rounded-full w-fit mb-4">
          <Award className="h-12 w-12 text-primary" />
        </div>
        <CardTitle className="font-headline text-3xl">{getResultMessage(percentage)}</CardTitle>
        {total > 0 ? (
          <>
            <p className="text-5xl font-bold text-foreground">{percentage}%</p>
            <CardDescription className="text-xl text-muted-foreground">You scored {score} out of {total} multiple choice questions correct.</CardDescription>
          </>
        ) : (
          <CardDescription className="text-xl text-muted-foreground">Your open-ended answers are ready for review below.</CardDescription>
        )}
        {user && <p className="text-sm text-muted-foreground pt-2">Results for {user.name} (ID: {user.studentId})</p>}
      </CardHeader>
      <CardContent>
        <h3 className="text-xl font-headline mb-4 text-center">Review Your Answers</h3>
        <Accordion type="single" collapsible className="w-full">
          {results.map((result, index) => (
            <AccordionItem value={`item-${index}`} key={index}>
              <AccordionTrigger className={cn("font-semibold text-left", result.questionType === 'multipleChoice' && (result.isCorrect ? 'text-green-600' : 'text-destructive'))}>
                <div className="flex items-start gap-3 text-left">
                  {result.questionType === 'multipleChoice'
                    ? (result.isCorrect ? <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-1" /> : <X className="h-5 w-5 text-destructive flex-shrink-0 mt-1" />)
                    : <Pencil className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                  }
                  <span className="flex-1">Question {index + 1}: <MarkdownRenderer>{result.question}</MarkdownRenderer></span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                {result.questionType === 'multipleChoice' ? (
                  <div className="space-y-2">
                    {result.options.map((option, optionIndex) => {
                      const isUserAnswer = option === result.userAnswer;
                      const isCorrectAnswer = option === result.answer;
                      return (
                        <div
                          key={optionIndex}
                          className={cn(
                            "p-3 rounded-md border text-left",
                            isCorrectAnswer ? "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700" : "",
                            isUserAnswer && !isCorrectAnswer ? "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700" : "",
                            !isUserAnswer && !isCorrectAnswer ? "bg-muted/50" : ""
                          )}
                        >
                          <p className="font-medium flex items-start gap-2">
                            {isUserAnswer && (result.isCorrect ? <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-1"/> : <X className="h-4 w-4 text-destructive flex-shrink-0 mt-1"/>)}
                            {isCorrectAnswer && !isUserAnswer && <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-1"/>}
                            <span className="flex-1"><MarkdownRenderer>{option}</MarkdownRenderer></span>
                          </p>
                          {isUserAnswer && !isCorrectAnswer && <p className="text-xs text-destructive pl-6">Your answer</p>}
                          {isCorrectAnswer && <p className="text-xs text-green-600 pl-6">Correct answer</p>}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2 text-muted-foreground">Your Answer:</h4>
                      <div className="p-3 rounded-md border bg-muted/50"><MarkdownRenderer>{result.userAnswer}</MarkdownRenderer></div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2 text-green-600">Suggested Solution:</h4>
                      <div className="p-3 rounded-md border border-green-600/50 bg-green-500/10"><MarkdownRenderer>{result.answer}</MarkdownRenderer></div>
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="text-center mt-8 flex flex-wrap justify-center gap-4">
          <Button onClick={onRetake} size="lg" variant="outline">
            <RotateCw className="mr-2 h-4 w-4" /> Retake Quiz
          </Button>
          <Button onClick={onRestart} size="lg">
            <Sparkles className="mr-2 h-4 w-4" /> Create New Quiz
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
