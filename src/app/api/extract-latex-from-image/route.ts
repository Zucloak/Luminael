import { NextRequest, NextResponse } from 'next/server';
import { extractLatexFromImage, ExtractLatexFromImageInput } from '@/ai/flows/extract-latex-from-image';

export async function POST(req: NextRequest) {
  try {
    const { imageDataUrl, localOcrAttempt, apiKey } = await req.json();

    if (!imageDataUrl) {
      return NextResponse.json({ error: 'imageDataUrl is required' }, { status: 400 });
    }

    const input: ExtractLatexFromImageInput = { imageDataUrl, localOcrAttempt, apiKey };
    const result = await extractLatexFromImage(input);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in extract-latex-from-image API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to extract LaTeX from image', details: errorMessage }, { status: 500 });
  }
}
