"use client";

import { useState } from 'react';
import type { Quiz } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';

interface QuizInterfaceProps {
  quiz: Quiz;
  onSubmit: (answers: Record<number, string>) => void;
}

export function QuizInterface({ quiz, onSubmit }: QuizInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const totalQuestions = quiz.questions.length;
  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  const handleAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAnswers({
      ...answers,
      [currentQuestionIndex]: e.target.value,
    });
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

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-2xl animate-in fade-in-50 duration-500">
      <CardHeader>
        <CardDescription>Question {currentQuestionIndex + 1} of {totalQuestions}</CardDescription>
        <CardTitle className="font-headline text-2xl md:text-3xl leading-tight">
          {currentQuestion.question}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder="Type your answer here..."
          value={answers[currentQuestionIndex] || ''}
          onChange={handleAnswerChange}
          className="min-h-[150px] text-base"
        />
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
            <Button onClick={() => onSubmit(answers)} className="bg-accent hover:bg-accent/90">
              <CheckCircle className="mr-2 h-4 w-4" /> Submit Quiz
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
