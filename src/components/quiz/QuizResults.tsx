
"use client";

import type { Quiz, UserProfile, Question, PastQuiz } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, X, Award, RotateCw, Pencil, Sparkles, BrainCircuit, CheckCircle, AlertCircle, XCircle, Save } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from '../common/MarkdownRenderer';
import { useApiKey } from '@/hooks/use-api-key';
import { useToast } from '@/hooks/use-toast';
import { addPastQuiz } from '@/lib/indexed-db';

interface QuizResultsProps {
  quiz: Quiz;
  answers: Record<number, string>;
  onRestart: () => void;
  onRetake: () => void;
  user: UserProfile | null;
  sourceContent: string;
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

const TAG_COLORS: { [key: string]: string } = {
  gray: 'bg-gray-400 hover:bg-gray-500',
  red: 'bg-red-400 hover:bg-red-500',
  orange: 'bg-orange-400 hover:bg-orange-500',
  yellow: 'bg-yellow-400 hover:bg-yellow-500',
  green: 'bg-green-400 hover:bg-green-500',
  blue: 'bg-blue-400 hover:bg-blue-500',
  purple: 'bg-purple-400 hover:bg-purple-500',
};


export function QuizResults({ quiz, answers, onRestart, onRetake, user, sourceContent }: QuizResultsProps) {
  const { apiKey, incrementUsage } = useApiKey();
  const [detailedResults, setDetailedResults] = useState<Result[]>([]);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveQuizName, setSaveQuizName] = useState('');
  const [saveQuizColor, setSaveQuizColor] = useState('gray');
  const { toast } = useToast();
  
  useEffect(() => {
    const initialResults: Result[] = quiz.questions.map((q, index) => {
      const userAnswer = answers[index] || 'No answer';
      if (q.questionType === 'multipleChoice') {
        const isCorrect = userAnswer === q.answer;
        return { ...q, userAnswer, isCorrect, isValidating: false };
      }
      
      const hasUserAnswer = answers[index] && answers[index].trim() !== '';

      return { 
        ...q, 
        userAnswer, 
        isCorrect: null, 
        isValidating: hasUserAnswer,
        ...(!hasUserAnswer && {
          validation: { status: 'Incorrect', explanation: 'No answer was provided.' } 
        })
      };
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
            incrementUsage();

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

  const handleSaveQuiz = async () => {
    if (!saveQuizName.trim()) {
      toast({ variant: 'destructive', title: 'Name Required', description: 'Please enter a name for your quiz.' });
      return;
    }
    const pastQuiz: PastQuiz = {
      id: Date.now(),
      title: saveQuizName,
      date: new Date().toISOString(),
      quiz,
      userAnswers: answers,
      score: { score, total, percentage },
      color: saveQuizColor,
      status: 'completed',
      sourceContent: sourceContent,
    };
    try {
      await addPastQuiz(pastQuiz);
      toast({ title: 'Quiz Saved!', description: `"${saveQuizName}" has been saved to your library.` });
      setIsSaveDialogOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the quiz to your browser.' });
    }
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
                  <div className="flex-1">Question {index + 1}: <MarkdownRenderer>{result.question}</MarkdownRenderer></div>
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
                            isCorrectAnswer ? "bg-green-500/10 border-green-500/40" : "",
                            isUserAnswer && !isCorrectAnswer ? "bg-red-500/10 border-red-500/40" : "",
                            !isUserAnswer && !isCorrectAnswer ? "bg-muted/50" : ""
                          )}
                        >
                          <div className="font-medium flex items-start gap-2">
                            {isUserAnswer && (result.isCorrect ? <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-1"/> : <X className="h-4 w-4 text-red-600 flex-shrink-0 mt-1"/>)}
                            {isCorrectAnswer && !isUserAnswer && <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-1"/>}
                            <div className="flex-1"><MarkdownRenderer>{option}</MarkdownRenderer></div>
                          </div>
                          {isUserAnswer && !isCorrectAnswer && <p className="text-xs text-red-600 pl-6">Your answer</p>}
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
                                result.validation.status === 'Correct' && "bg-green-500/10 border-green-500/40",
                                result.validation.status === 'Partially Correct' && "bg-yellow-500/10 border-yellow-500/40",
                                result.validation.status === 'Incorrect' && "bg-destructive/10 border-destructive/40",
                            )}>
                                <div className="flex items-center gap-2 font-bold">
                                    {result.validation.status === 'Correct' && <CheckCircle className="h-5 w-5 text-green-600" />}
                                    {result.validation.status === 'Partially Correct' && <AlertCircle className="h-5 w-5 text-yellow-600" />}
                                    {result.validation.status === 'Incorrect' && <XCircle className="h-5 w-5 text-destructive" />}
                                    <span className={cn(
                                        result.validation.status === 'Correct' && "text-green-600",
                                        result.validation.status === 'Partially Correct' && "text-yellow-600",
                                        result.validation.status === 'Incorrect' && "text-destructive",
                                    )}>{result.validation.status}</span>
                                </div>
                                <div className="text-sm text-foreground/90 pl-7"><MarkdownRenderer>{result.validation.explanation}</MarkdownRenderer></div>
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
            <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                <DialogTrigger asChild>
                    <Button size="lg" variant="secondary"><Save className="mr-2 h-4 w-4" />Save Quiz</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save Quiz</DialogTitle>
                        <DialogDescription>
                            Save this quiz session to your library for later review or retakes.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="quiz-name">Quiz Name</Label>
                            <Input id="quiz-name" value={saveQuizName} onChange={(e) => setSaveQuizName(e.target.value)} placeholder="e.g., Chapter 5 Biology Review" />
                        </div>
                        <div className="space-y-2">
                            <Label>Color Tag</Label>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(TAG_COLORS).map(([colorName, colorClass]) => (
                                <button
                                    key={colorName}
                                    type="button"
                                    onClick={() => setSaveQuizColor(colorName)}
                                    className={cn(
                                        'h-8 w-8 rounded-full transition-transform duration-200',
                                        colorClass,
                                        saveQuizColor === colorName ? 'ring-2 ring-offset-2 ring-primary ring-offset-background' : 'hover:scale-110'
                                    )}
                                    aria-label={`Select ${colorName} color tag`}
                                />
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSaveQuiz}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
