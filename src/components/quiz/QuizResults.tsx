
"use client";

import type { Quiz, UserProfile, Question, PastQuiz } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, X, Award, RotateCw, Pencil, Sparkles, BrainCircuit, CheckCircle, AlertCircle, XCircle, Save, Loader2 } from 'lucide-react'; // Added Loader2
import { useState, useEffect, useMemo, useCallback } from 'react'; // Added useCallback
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
  isEcoModeActive?: boolean; // Add isEcoModeActive prop
}

type ValidationStatus = 'Correct' | 'Partially Correct' | 'Incorrect' | 'Deferred' | null;

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


export function QuizResults({ quiz, answers, onRestart, onRetake, user, sourceContent, isEcoModeActive }: QuizResultsProps) {
  const { apiKey, incrementUsage } = useApiKey();
  const [detailedResults, setDetailedResults] = useState<Result[]>([]);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveQuizName, setSaveQuizName] = useState('');
  const [saveQuizColor, setSaveQuizColor] = useState('gray');
  const { toast } = useToast();
  
  useEffect(() => {
    const initialResults: Result[] = quiz.questions.map((q, index) => {
      const userAnswer = answers[index] || 'No answer';
      const userAnswerProvided = typeof answers[index] === 'string' && answers[index].trim() !== '';

      if (q.questionType === 'multipleChoice') {
        const isCorrect = userAnswer === q.answer;
        return { ...q, userAnswer, isCorrect, isValidating: false };
      } else if (q.questionType === 'openEnded') {
        return {
          ...q,
          userAnswer,
          isCorrect: null,
          isValidating: isEcoModeActive ? false : userAnswerProvided,
          validation: isEcoModeActive && userAnswerProvided
            ? { status: 'Deferred', explanation: 'AI validation deferred. Click to validate.'}
            : (!userAnswerProvided ? { status: 'Incorrect', explanation: 'No answer was provided.' } : undefined)
        };
      } else if (q.questionType === 'problemSolving') {
        return {
          ...q,
          userAnswer,
          isCorrect: null,
          isValidating: isEcoModeActive ? false : userAnswerProvided,
          validation: isEcoModeActive && userAnswerProvided
            ? { status: 'Deferred', explanation: 'AI validation deferred. Click to validate.'}
            : (!userAnswerProvided ? { status: 'Incorrect', explanation: 'No answer was provided.' } : undefined)
        };
      } else {
        const _exhaustiveCheck: never = q;
        console.error("Unhandled question type in QuizResults.tsx:", _exhaustiveCheck);
        throw new Error(`Unhandled question type: ${JSON.stringify(q)}`);
      }
    });
    setDetailedResults(initialResults);
  }, [quiz, answers, isEcoModeActive]); // Added isEcoModeActive to dependency array for initial setup

  const validateSingleAnswer = useCallback(async (questionIndex: number) => {
    if (!apiKey) {
      toast({ variant: "destructive", title: "API Key Missing", description: "Cannot validate answer without an API key." });
      setDetailedResults(prevResults =>
        prevResults.map((r, idx) =>
          idx === questionIndex
            ? { ...r, isValidating: false, validation: { status: 'Incorrect', explanation: 'An API key is required for AI validation.' } }
            : r
        )
      );
      return;
    }

    const resultToValidate = detailedResults[questionIndex];
    if (!resultToValidate || !(resultToValidate.questionType === 'openEnded' || resultToValidate.questionType === 'problemSolving') || resultToValidate.userAnswer === 'No answer') {
      return;
    }

    setDetailedResults(prevResults =>
      prevResults.map((r, idx) =>
        idx === questionIndex ? { ...r, isValidating: true, validation: undefined } : r
      )
    );

    try {
      const res = await fetch('/api/validate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: resultToValidate.question,
          userAnswer: resultToValidate.userAnswer,
          correctAnswer: resultToValidate.answer,
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
      const validationResultData: ValidationResult = await res.json();
      setDetailedResults(prevResults =>
        prevResults.map((r, idx) =>
          idx === questionIndex
            ? { ...r, isValidating: false, validation: validationResultData }
            : r
        )
      );
    } catch (error) {
      console.error("Validation error for question:", resultToValidate.question, error);
      const message = error instanceof Error ? error.message : 'An error occurred during AI validation.';
      setDetailedResults(prevResults =>
        prevResults.map((r, idx) =>
          idx === questionIndex
            ? { ...r, isValidating: false, validation: { status: 'Incorrect', explanation: message } }
            : r
        )
      );
    }
  }, [apiKey, detailedResults, incrementUsage, toast]); // toast added to dependency array

  useEffect(() => {
    const validateAllPendingAnswers = async () => {
      if (isEcoModeActive) {
        // If EcoMode became active *after* initial setup, ensure pending items are marked Deferred.
        // The initial useEffect for setting detailedResults already handles the initial 'Deferred' state.
        // This ensures that if isEcoModeActive changes, we correctly update any items that were `isValidating:true`.
        const needsDeferredUpdate = detailedResults.some(r => r.isValidating && (!r.validation || r.validation.status !== 'Deferred'));
        if (needsDeferredUpdate) {
            setDetailedResults(prevResults =>
              prevResults.map(r => {
                if ((r.questionType === 'openEnded' || r.questionType === 'problemSolving') &&
                    r.isValidating &&
                    (!r.validation || r.validation.status !== 'Deferred')) {
                  return {
                    ...r,
                    isValidating: false,
                    validation: { status: 'Deferred', explanation: 'AI validation deferred. Click to validate.' }
                  };
                }
                return r;
              })
            );
        }
        return;
      }

      if (!apiKey) {
         setDetailedResults(prevResults =>
          prevResults.map(r => {
            if ((r.questionType === 'openEnded' || r.questionType === 'problemSolving') && r.isValidating && !r.validation) {
              return {
                ...r,
                isValidating: false,
                validation: { status: 'Incorrect', explanation: 'An API key is required for AI validation.' }
              };
            }
            return r;
          })
        );
        return;
      }

      const questionsToValidate = detailedResults.reduce((acc, result, index) => {
        if ((result.questionType === 'openEnded' || result.questionType === 'problemSolving') && result.isValidating && !result.validation) {
          acc.push({ ...result, originalIndex: index });
        }
        return acc;
      }, [] as (Result & { originalIndex: number })[]);

      if (questionsToValidate.length === 0) return;

      for (const resultToValidate of questionsToValidate) {
        try {
          const res = await fetch('/api/validate-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: resultToValidate.question,
              userAnswer: resultToValidate.userAnswer,
              correctAnswer: resultToValidate.answer,
              apiKey,
            }),
          });
          incrementUsage();

          let validationResultData: ValidationResult;
          if (!res.ok) {
            const errorText = await res.text();
            try {
              const errorData = JSON.parse(errorText);
              validationResultData = { status: 'Incorrect', explanation: errorData.details || errorData.error || `Validation failed: ${res.status}` };
            } catch (jsonError) {
              validationResultData = { status: 'Incorrect', explanation: `Validation failed: Server returned non-JSON error. Status: ${res.status}` };
            }
          } else {
            validationResultData = await res.json();
          }

          setDetailedResults(prevResults =>
            prevResults.map((r, idx) =>
              idx === resultToValidate.originalIndex
                ? { ...r, isValidating: false, validation: validationResultData }
                : r
            )
          );
        } catch (error) {
          console.error("Validation error for question:", resultToValidate.question, error);
          const message = error instanceof Error ? error.message : 'An error occurred during AI validation.';
          setDetailedResults(prevResults =>
            prevResults.map((r, idx) =>
              idx === resultToValidate.originalIndex
                ? { ...r, isValidating: false, validation: { status: 'Incorrect', explanation: message } }
                : r
            )
          );
        }
      }
    };

    if (!isEcoModeActive && detailedResults.some(r => r.isValidating && !r.validation)) {
      validateAllPendingAnswers();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailedResults, apiKey, incrementUsage, isEcoModeActive]);


  const { score, total, percentage, openEndedReviewedCount, problemSolvingReviewedCount } = useMemo(() => {
    let correctMCCount = 0;
    let reviewedOECount = 0;
    let reviewedPSCount = 0;

    const multipleChoiceQuestions = detailedResults.filter(q => q.questionType === 'multipleChoice');
    const openEndedQuestions = detailedResults.filter(q => q.questionType === 'openEnded');
    const problemSolvingQuestions = detailedResults.filter(q => q.questionType === 'problemSolving');

    const totalMultipleChoice = multipleChoiceQuestions.length;

    multipleChoiceQuestions.forEach(r => {
        if(r.isCorrect) {
            correctMCCount++;
        }
    });

    openEndedQuestions.forEach(r => {
      if (r.userAnswer !== 'No answer' && (r.validation || !r.isValidating)) { // Considered reviewed if answered and validation attempted/done
        reviewedOECount++;
      }
    });

    problemSolvingQuestions.forEach(r => {
      if (r.userAnswer !== 'No answer' && (r.validation || !r.isValidating)) { // Considered reviewed if answered and validation attempted/done
        reviewedPSCount++;
      }
    });
    
    const calculatedPercentage = totalMultipleChoice > 0 ? Math.round((correctMCCount / totalMultipleChoice) * 100) : 0;

    return {
      score: correctMCCount,
      total: totalMultipleChoice,
      percentage: calculatedPercentage,
      openEndedReviewedCount: reviewedOECount,
      problemSolvingReviewedCount: reviewedPSCount,
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
        {total > 0 && (
          <>
            <p className="text-5xl font-bold text-foreground">{percentage}%</p>
            <CardDescription className="text-xl text-muted-foreground">You scored {score} out of {total} multiple choice questions correct.</CardDescription>
          </>
        )}
        {(openEndedReviewedCount > 0 || problemSolvingReviewedCount > 0) && total === 0 && (
           <CardDescription className="text-xl text-muted-foreground">Your answers are ready for review below.</CardDescription>
        )}
        {total === 0 && openEndedReviewedCount === 0 && problemSolvingReviewedCount === 0 && (
            <CardDescription className="text-xl text-muted-foreground">No scorable questions in this quiz. Review your answers below if applicable.</CardDescription>
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
                (result.questionType === 'openEnded' || result.questionType === 'problemSolving') && !result.isValidating && result.validation && (
                    result.validation.status === 'Correct' ? 'text-green-600' :
                    result.validation.status === 'Partially Correct' ? 'text-yellow-600' :
                    'text-destructive'
                )
              )}>
                <div className="flex items-start gap-3 text-left">
                  {result.questionType === 'multipleChoice' ? (
                    result.isCorrect ? <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-1" /> : <X className="h-5 w-5 text-destructive flex-shrink-0 mt-1" />
                  ) : result.isValidating ? (
                    <BrainCircuit className="h-5 w-5 text-primary flex-shrink-0 mt-1 animate-pulse" />
                  ) : result.validation?.status === 'Correct' ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-1" />
                  ) : result.validation?.status === 'Partially Correct' ? (
                    <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-1" />
                  ) : result.validation?.status === 'Incorrect' ? (
                    <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-1" />
                  ) : (
                    <Pencil className="h-5 w-5 text-primary flex-shrink-0 mt-1" /> // Default icon if no validation status (e.g. before validation)
                  )}
                  <div className="flex-1">Question {index + 1}: <MarkdownRenderer>{result.question}</MarkdownRenderer></div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                {result.questionType === 'multipleChoice' && (
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
                      );
                    })}
                  </div>
                )}

                {(result.questionType === 'openEnded' || result.questionType === 'problemSolving') && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2 text-muted-foreground">Your Answer:</h4>
                      <div className="p-3 rounded-md border bg-muted/50">
                        {result.userAnswer === 'No answer' ? <em>No answer provided.</em> : <MarkdownRenderer>{result.userAnswer}</MarkdownRenderer>}
                      </div>
                    </div>

                    { (result.questionType === 'openEnded' || result.questionType === 'problemSolving') && (
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
                            ) : result.validation?.status === 'Deferred' ? (
                                <div className="p-3 rounded-md border border-dashed bg-muted/20 space-y-2">
                                    <p className="text-sm text-muted-foreground italic">{result.validation.explanation}</p>
                                    <Button size="sm" onClick={() => validateSingleAnswer(index)} disabled={!apiKey || result.isValidating}>
                                        {result.isValidating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
                                        Validate with AI
                                    </Button>
                                    {!apiKey && <p className="text-xs text-destructive">API key required to validate.</p>}
                                </div>
                            ) : (
                              <div className="p-3 rounded-md border bg-muted/20">
                                <p className="text-sm text-muted-foreground">AI validation was not performed for this question (e.g. no API key, or no answer provided, or not applicable).</p>
                              </div>
                            )}
                        </div>
                    )}

                    <div>
                      <h4 className="font-semibold mb-2 text-green-600">
                        {result.questionType === 'problemSolving' ? 'Correct Solution:' : 'Suggested Answer:'}
                      </h4>
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
