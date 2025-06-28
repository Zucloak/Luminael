import { NextRequest, NextResponse } from 'next/server';
import { validateAnswer, ValidateAnswerInput } from '@/ai/flows/validate-answer';

export async function POST(req: NextRequest) {
  try {
    const { question, userAnswer, correctAnswer, apiKey } = await req.json();

    if (!question || !userAnswer || !correctAnswer) {
      return NextResponse.json({ error: 'question, userAnswer, and correctAnswer are required' }, { status: 400 });
    }

    const input: ValidateAnswerInput = { question, userAnswer, correctAnswer, apiKey };
    const validationResult = await validateAnswer(input);

    return NextResponse.json(validationResult);
  } catch (error) {
    console.error('Error in validate-answer API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to validate answer', details: errorMessage }, { status: 500 });
  }
}
