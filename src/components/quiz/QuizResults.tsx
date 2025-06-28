"use client";

import type { Quiz, UserProfile, Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Check, X, Award, RotateCw, Pencil, Sparkles, BrainCircuit, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from '../common/MarkdownRenderer';
import { useApiKey } from '@/hooks/use-api-key';

interface QuizResultsProps {
  quiz: Quiz;
  answers: Record<number, string>;
  onRestart: () => void;
  onRetake: () => void;
  user: UserProfile | null;
}

type ValidationStatus = 'Correct' | 'Partially Correct' | 'Incorrect' | null;

interface ValidationResult {
  status: ValidationStatus;
  explanation: string;
}

type Result = (Question & { 
  userAnswer: string; 
  isCorrect: boolean | null;
  validation?: ValidationResult;
  isValidating?: boolean;
});

export function QuizResults({ quiz, answers, onRestart, onRetake, user }: QuizResultsProps) {
  const { apiKey } = useApiKey();
  const [detailedResults, setDetailedResults] = useState<Result[]>([]);
  
  useEffect(() => {
    const initialResults: Result[] = quiz.questions.map((q, index) => {
      const userAnswer = answers[index] || 'No answer';
      if (q.questionType === 'multipleChoice') {
        const isCorrect = userAnswer === q.answer;
        return { ...q, userAnswer, isCorrect, isValidating: false };
      }
      return { ...q, userAnswer, isCorrect: null, isValidating: true };
    });
    setDetailedResults(initialResults);
  }, [quiz, answers]);

  useEffect(() => {
    const validateAnswers = async () => {
      if (!apiKey) {
        setDetailedResults(prevResults =>
          prevResults.map(r =>
            r.questionType === 'openEnded' && r.isValidating
              ? { ...r, isValidating: false, validation: { status: 'Incorrect', explanation: 'An API key is required for AI validation.' } }
              : r
          )
        );
        return;
      }
      
      for (const [index, result] of detailedResults.entries()) {
        if (result.questionType === 'openEnded' && result.isValidating) {
          try {
            const res = await fetch('/api/validate-answer', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                question: result.question,
                userAnswer: result.userAnswer,
                correctAnswer: result.answer,
                apiKey,
              }),
            });
            if (!res.ok) {
              const errorText = await res.text();
              try {
                const errorData = JSON.parse(errorText);
                throw new Error(errorData.details || errorData.error || `Validation failed with status ${res.status}`);
              } catch (jsonError) {
                throw new Error(`Validation failed: The server returned an unexpected response. Status: ${res.status}`);
              }
            }
            const validationResult: ValidationResult = await res.json();
            
            setDetailedResults(prevResults => {
              const newResults = [...prevResults];
              newResults[index] = {
                ...newResults[index],
                isValidating: false,
                validation: validationResult,
              };
              return newResults;
            });
          } catch (error) {
            console.error("Validation error for question:", result.question, error);
            const message = error instanceof Error ? error.message : 'An error occurred during AI validation.';
            setDetailedResults(prevResults => {
              const newResults = [...prevResults];
              newResults[index] = {
                ...newResults[index],
                isValidating: false,
                validation: { status: 'Incorrect', explanation: message },
              };
              return newResults;
            });
          }
        }
      }
    };

    if (detailedResults.some(r => r.isValidating)) {
      validateAnswers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailedResults, apiKey]);


  const { score, total, percentage } = useMemo(() => {
    let correctCount = 0;
    const multipleChoiceQuestions = detailedResults.filter(q => q.questionType === 'multipleChoice');
    const totalMultipleChoice = multipleChoiceQuestions.length;

    multipleChoiceQuestions.forEach(r => {
        if(r.isCorrect) {
            correctCount++;
        }
    });
    
    const calculatedPercentage = totalMultipleChoice > 0 ? Math.round((correctCount / totalMultipleChoice) * 100) : 0;

    return {
      score: correctCount,
      total: totalMultipleChoice,
      percentage: calculatedPercentage,
    };
  }, [detailedResults]);

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
          {detailedResults.map((result, index) => (
            <AccordionItem value={`item-${index}`} key={index}>
              <AccordionTrigger className={cn(
                "font-semibold text-left",
                result.questionType === 'multipleChoice' && (result.isCorrect ? 'text-green-600' : 'text-destructive'),
                result.questionType === 'openEnded' && !result.isValidating && result.validation && (
                    result.validation.status === 'Correct' ? 'text-green-600' :
                    result.validation.status === 'Partially Correct' ? 'text-yellow-600' :
                    'text-destructive'
                )
              )}>
                <div className="flex items-start gap-3 text-left">
                  {result.questionType === 'multipleChoice'
                    ? (result.isCorrect ? <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-1" /> : <X className="h-5 w-5 text-destructive flex-shrink-0 mt-1" />)
                    : result.isValidating 
                      ? <BrainCircuit className="h-5 w-5 text-primary flex-shrink-0 mt-1 animate-pulse" />
                      : result.validation?.status === 'Correct'
                        ? <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-1" />
                        : result.validation?.status === 'Partially Correct'
                          ? <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-1" />
                          : result.validation?.status === 'Incorrect'
                            ? <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-1" />
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
                        <h4 className="font-semibold mb-2 text-primary">AI Validation:</h4>
                        {result.isValidating ? (
                            <div className="p-3 rounded-md border border-dashed flex items-center gap-3 animate-pulse">
                                <BrainCircuit className="h-5 w-5 text-primary" />
                                <span className="text-muted-foreground font-medium">Validating your answer with AI...</span>
                            </div>
                        ) : result.validation ? (
                            <div className={cn(
                                "p-3 rounded-md border space-y-2",
                                result.validation.status === 'Correct' && "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700",
                                result.validation.status === 'Partially Correct' && "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700",
                                result.validation.status === 'Incorrect' && "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700",
                            )}>
                                <div className="flex items-center gap-2 font-bold">
                                    {result.validation.status === 'Correct' && <CheckCircle className="h-5 w-5 text-green-600" />}
                                    {result.validation.status === 'Partially Correct' && <AlertCircle className="h-5 w-5 text-yellow-600" />}
                                    {result.validation.status === 'Incorrect' && <XCircle className="h-5 w-5 text-destructive" />}
                                    <span className={cn(
                                        result.validation.status === 'Correct' && "text-green-700 dark:text-green-300",
                                        result.validation.status === 'Partially Correct' && "text-yellow-700 dark:text-yellow-300",
                                        result.validation.status === 'Incorrect' && "text-destructive",
                                    )}>{result.validation.status}</span>
                                </div>
                                <div className="text-sm text-foreground/80 pl-7"><MarkdownRenderer>{result.validation.explanation}</MarkdownRenderer></div>
                            </div>
                        ) : null}
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
