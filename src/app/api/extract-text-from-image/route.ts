import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromImage } from '@/ai/flows/extractTextFromImage';

export async function POST(req: NextRequest) {
  try {
    const { imageDataUrl, localOcrAttempt, apiKey } = await req.json();

    if (!imageDataUrl) {
      return NextResponse.json({ error: 'imageDataUrl is required' }, { status: 400 });
    }

    const result = await extractTextFromImage({ imageDataUrl, localOcrAttempt, apiKey });

    // The flow now returns a string directly
    return NextResponse.json({ extractedText: result });
  } catch (error) {
    console.error('Error in extract-text-from-image API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to extract text from image', details: errorMessage }, { status: 500 });
  }
}
