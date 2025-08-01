
"use client";

import { useState, useEffect, useRef } from 'react';
import type { Quiz, PastQuiz } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, CheckCircle, Timer, LogOut, ImageUp, Loader2, Save } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MarkdownRenderer } from '../common/MarkdownRenderer';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { useApiKey } from '@/hooks/use-api-key';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { ocrImageWithFallback } from '@/lib/ocr';
import { addPastQuiz } from '@/lib/indexed-db';
import { replaceLatexDelimiters } from '@/lib/utils'; // Import the delimiter replacer


interface QuizInterfaceProps {
  quiz: Quiz;
  timer: number;
  onSubmit: (answers: Record<number, string>) => void;
  onExit: () => void;
  isHellBound?: boolean;
  sourceContent: string;
}

const TAG_COLORS: { [key: string]: string } = {
  gray: 'bg-gray-400 hover:bg-gray-500',
  red: 'bg-red-400 hover:bg-red-500',
  orange: 'bg-orange-400 hover:bg-orange-500',
  yellow: 'bg-yellow-400 hover:bg-yellow-500',
  green: 'bg-green-400 hover:bg-green-500',
  blue: 'bg-blue-400 hover:bg-blue-500',
  purple: 'bg-purple-400 hover:bg-purple-500',
};

export function QuizInterface({ quiz, timer, onSubmit, onExit, isHellBound = false, sourceContent }: QuizInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(timer);
  const { apiKey, incrementUsage } = useApiKey();
  const { toast } = useToast();
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveQuizName, setSaveQuizName] = useState('');
  const [saveQuizColor, setSaveQuizColor] = useState('gray');
  const [sanitizedPreview, setSanitizedPreview] = useState('');
  const totalQuestions = quiz?.questions?.length || 0;
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timer <= 0 || totalQuestions === 0) return;

    setTimeLeft(timer); // Reset timer for new question

    const intervalId = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearInterval(intervalId);
          // Time's up, move to next question or submit
          if (currentQuestionIndex < totalQuestions - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
          } else {
            onSubmit(answers);
          }
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    // Cleanup interval on component unmount or when question changes
    return () => clearInterval(intervalId);
  }, [currentQuestionIndex, timer, totalQuestions, answers, onSubmit]);

  useEffect(() => {
    const currentAnswer = answers[currentQuestionIndex] || '';
    if (currentAnswer.includes('$')) {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await fetch('/api/sanitize-input', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input: currentAnswer }),
          });
          if (response.ok) {
            const data = await response.json();
            setSanitizedPreview(data.sanitized);
          } else {
            // On failure, render a safe version of the original content
            setSanitizedPreview(currentAnswer.replace(/</g, "&lt;").replace(/>/g, "&gt;"));
          }
        } catch (error) {
          console.error("Sanitization call failed:", error);
          setSanitizedPreview("Error: Could not sanitize content.");
        }
      }, 300); // 300ms debounce
    } else {
        setSanitizedPreview(''); // Clear preview if no LaTeX
    }
  }, [answers, currentQuestionIndex]);

  if (totalQuestions === 0) {
    return (
      <Card className="w-full max-w-3xl mx-auto shadow-2xl animate-in fade-in-50 duration-500">
        <CardHeader className="text-center">
          <CardTitle>Empty Quiz</CardTitle>
          <CardDescription>No questions were found for this quiz.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-center">The AI may have failed to generate questions. Please go back and try again.</p>
        </CardContent>
        <CardFooter className="flex justify-center">
            <Button onClick={onExit}>
                <LogOut className="mr-2 h-4 w-4" />
                Back to Setup
            </Button>
        </CardFooter>
      </Card>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  const handleAnswerChange = (value: string) => {
    setAnswers({
      ...answers,
      [currentQuestionIndex]: value,
    });
  };

  const handleImageAnswerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!apiKey) {
      toast({
        variant: "destructive",
        title: "API Key Required",
        description: "Please set your Gemini API key to use the image upload feature.",
      });
      return;
    }
    
    setIsOcrRunning(true);
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const imageDataUrl = reader.result as string;
      
      try {
        let extractedText: string;
        if (currentQuestion.questionType === 'openEnded' || currentQuestion.questionType === 'problemSolving') {
            const response = await fetch('/api/extract-latex-from-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageDataUrl, localOcrAttempt: '', apiKey }),
            });
            incrementUsage();

            const responseText = await response.text();
            if (!response.ok) {
                let errorDetails = "Failed to extract LaTeX from image.";
                try {
                    const errorJson = JSON.parse(responseText);
                    errorDetails = errorJson.details || errorJson.error || errorDetails;
                } catch (e) {
                    errorDetails = responseText.substring(0, 200);
                }
                throw new Error(errorDetails);
            }

            const { latex_representation, confidence_score } = JSON.parse(responseText);
            extractedText = latex_representation;
            toast({
                title: "Math Extracted!",
                description: `Content converted to LaTeX with ${confidence_score}% confidence. You can now edit it if needed.`
            });
        } else {
            const { text, source } = await ocrImageWithFallback(imageDataUrl, apiKey, incrementUsage);
            extractedText = text;
             if (source === 'local') {
                toast({ title: "Text Extracted!", description: "Text extracted locally with Tesseract." });
            } else {
                toast({ title: "Text Extracted with AI!", description: "The text from the image has been added to your answer." });
            }
        }
        const standardizedText = replaceLatexDelimiters(extractedText);
        handleAnswerChange(standardizedText);
      } catch (error) {
        console.error("Image Extraction Error:", error);
        const message = error instanceof Error ? error.message : "An unknown error occurred during image processing.";
        toast({
          variant: "destructive",
          title: currentQuestion.questionType === 'openEnded' ? "LaTeX Extraction Failed" : "Text Extraction Failed",
          description: message,
        });
      } finally {
        setIsOcrRunning(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
      }
    };
    reader.onerror = (error) => {
      console.error("File Reader Error:", error);
      toast({
        variant: "destructive",
        title: "File Error",
        description: "Could not read the selected image file.",
      });
      setIsOcrRunning(false);
    };
  };

  const goToNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSaveAndExit = async () => {
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
        sourceContent,
        status: 'in-progress',
        color: saveQuizColor,
    };
    try {
        await addPastQuiz(pastQuiz);
        toast({ title: 'Progress Saved!', description: `Your quiz "${saveQuizName}" has been saved. You can resume it later.` });
        setIsSaveDialogOpen(false);
        onExit();
    } catch (error) {
        toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the quiz progress.' });
    }
  };


  return (
    <Card className="w-full max-w-3xl mx-auto shadow-2xl animate-in fade-in-50 duration-500">
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardDescription>Question {currentQuestionIndex + 1} of {totalQuestions}</CardDescription>
            <div className="flex items-center gap-2">
              <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                  <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                          <Save className="mr-2 h-4 w-4" />
                          Save & Exit
                      </Button>
                  </DialogTrigger>
                  <DialogContent className={cn(isHellBound && "hell-bound text-foreground")}>
                      <DialogHeader>
                          <DialogTitle>Save Progress</DialogTitle>
                          <DialogDescription>
                            Don&apos;t have time? Save your quiz now and continue later from where you left off.
                          </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                          <div className="space-y-2">
                              <Label htmlFor="quiz-name-progress">Quiz Name</Label>
                              <Input id="quiz-name-progress" value={saveQuizName} onChange={(e) => setSaveQuizName(e.target.value)} placeholder="e.g., Midterm Study Session" />
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
                          <Button onClick={handleSaveAndExit}>Save Progress</Button>
                      </DialogFooter>
                  </DialogContent>
              </Dialog>
              {timer > 0 && (
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground rounded-full bg-muted px-3 py-1">
                      <Timer className="h-4 w-4" />
                      <span>{timeLeft}s left</span>
                  </div>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <LogOut className="mr-2 h-4 w-4" />
                    Exit
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className={cn(isHellBound && "hell-bound text-foreground")}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to exit?</AlertDialogTitle>
                    <AlertDialogDescription>
                      All your progress in this quiz will be lost. Use &quot;Save &amp; Exit&quot; to keep your progress.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onExit}>Exit Quiz</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
        </div>
        <CardTitle className="font-headline text-2xl md:text-3xl leading-tight pt-2">
          <MarkdownRenderer>{replaceLatexDelimiters(currentQuestion.question)}</MarkdownRenderer>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {currentQuestion.questionType === 'multipleChoice' ? (
          <RadioGroup
            value={answers[currentQuestionIndex] || ''}
            onValueChange={handleAnswerChange}
            className="space-y-4"
          >
            {currentQuestion.options.map((option, index) => (
              <div key={index} className="p-4 border rounded-md has-[:checked]:bg-primary/10 has-[:checked]:border-primary">
                <Label htmlFor={`q${currentQuestionIndex}-o${index}`} className="flex items-center space-x-3 font-normal text-base cursor-pointer w-full">
                  <RadioGroupItem value={option} id={`q${currentQuestionIndex}-o${index}`} />
                  <div className="flex-1">
                    <MarkdownRenderer>{replaceLatexDelimiters(option)}</MarkdownRenderer>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="open-ended-answer">Your Answer</Label>
                {(currentQuestion.questionType === 'openEnded' || currentQuestion.questionType === 'problemSolving') && (
                  <>
                    <Input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleImageAnswerUpload}
                      disabled={isOcrRunning}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isOcrRunning}
                    >
                      {isOcrRunning ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ImageUp className="mr-2 h-4 w-4" />
                      )}
                      Upload Image
                    </Button>
                  </>
                )}
              </div>
              <Textarea
                id="open-ended-answer"
                placeholder="Type your answer here, or upload an image of your work."
                value={answers[currentQuestionIndex] || ''}
                onChange={(e) => handleAnswerChange(e.target.value)}
                rows={6}
                className="text-base"
              />
            </div>
            {sanitizedPreview && (
              <div className="space-y-2">
                <Label>Live Preview (Sanitized)</Label>
                <Card className="p-4 bg-muted/50 min-h-[4rem] flex items-center justify-center text-lg">
                  <MarkdownRenderer>
                    {replaceLatexDelimiters(sanitizedPreview)}
                  </MarkdownRenderer>
                </Card>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Progress value={progress} className="w-full" />
        <div className="flex justify-between w-full">
          <Button variant="outline" onClick={goToPrevious} disabled={currentQuestionIndex === 0}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Previous
          </Button>
          {currentQuestionIndex < totalQuestions - 1 ? (
            <Button onClick={goToNext}>
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => onSubmit(answers)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <CheckCircle className="mr-2 h-4 w-4" /> Submit Quiz
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
