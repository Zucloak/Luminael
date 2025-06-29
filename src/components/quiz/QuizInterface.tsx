"use client";

import { useState, useEffect, useRef } from 'react';
import type { Quiz } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, CheckCircle, Timer, LogOut, ImageUp, Loader2 } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { useApiKey } from '@/hooks/use-api-key';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import Tesseract from 'tesseract.js';

interface QuizInterfaceProps {
  quiz: Quiz;
  timer: number;
  onSubmit: (answers: Record<number, string>) => void;
  onExit: () => void;
  isHellBound?: boolean;
}

export function QuizInterface({ quiz, timer, onSubmit, onExit, isHellBound = false }: QuizInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(timer);
  const { apiKey } = useApiKey();
  const { toast } = useToast();
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!quiz?.questions?.length) {
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

  const totalQuestions = quiz.questions.length;
  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  useEffect(() => {
    if (timer <= 0) return;

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
    toast({ title: "Processing Image...", description: "This may take a moment." });
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const imageDataUrl = reader.result as string;
      let localOcrAttempt = '';

      try {
        // Tier 1: Local OCR with Tesseract.js as a "hint" for the AI
        try {
          toast({ title: "Step 1: Performing Local OCR", description: "Analyzing image on your device..." });
          const { data: { text } } = await Tesseract.recognize(imageDataUrl, 'eng');
          localOcrAttempt = text;
        } catch (tesseractError) {
          console.warn("Local Tesseract OCR failed, proceeding with AI only.", tesseractError);
          localOcrAttempt = ''; // Ensure it's empty on failure
        }
        
        // Tier 2: AI-powered LaTeX extraction
        toast({ title: "Step 2: Sending to AI", description: "AI is converting your work to LaTeX..." });
        const response = await fetch('/api/extract-latex-from-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageDataUrl, localOcrAttempt, apiKey }),
        });

        const responseText = await response.text();
        if (!response.ok) {
           let errorDetails = "Failed to extract text.";
          try {
            const errorJson = JSON.parse(responseText);
            errorDetails = errorJson.details || errorJson.error || errorDetails;
          } catch (e) {
            // responseText is not JSON, use it as is
            errorDetails = responseText;
          }
          throw new Error(errorDetails);
        }

        const { latex_representation, confidence_score } = JSON.parse(responseText);
        handleAnswerChange(latex_representation);
        toast({
            title: "Math Extracted!",
            description: `Content converted to LaTeX with ${confidence_score}% confidence. You can now edit the LaTeX if needed.`
        });
      } catch (error) {
        console.error("Image-to-LaTeX Error:", error);
        const message = error instanceof Error ? error.message : "An unknown error occurred during image processing.";
        toast({
          variant: "destructive",
          title: "Extraction Failed",
          description: message,
        });
      } finally {
        setIsOcrRunning(false);
        // Reset file input so user can upload the same file again
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
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-2xl animate-in fade-in-50 duration-500">
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardDescription>Question {currentQuestionIndex + 1} of {totalQuestions}</CardDescription>
            <div className="flex items-center gap-4">
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
                      All your progress in this quiz will be lost. You will be returned to the main setup screen.
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
          <MarkdownRenderer>{currentQuestion.question}</MarkdownRenderer>
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
              <div key={index} className="flex items-center space-x-3 p-4 border rounded-md has-[:checked]:bg-primary/10 has-[:checked]:border-primary">
                <RadioGroupItem value={option} id={`q${currentQuestionIndex}-o${index}`} />
                <Label htmlFor={`q${currentQuestionIndex}-o${index}`} className="font-normal text-base cursor-pointer flex-1">
                  <MarkdownRenderer>{option}</MarkdownRenderer>
                </Label>
              </div>
            ))}
          </RadioGroup>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="open-ended-answer">Your Answer</Label>
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
            </div>
            <Textarea
              id="open-ended-answer"
              placeholder="Type your solution here, or upload an image of your work."
              value={answers[currentQuestionIndex] || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
              rows={8}
              className="text-base"
            />
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
