import { NextRequest, NextResponse } from 'next/server';
import { summarizeText } from '@/ai/flows/summarizeTextFlow';

/**
 * This is the Next.js API Route handler.
 * It acts as the bridge between the frontend and the Genkit AI flow.
 */
export async function POST(req: NextRequest) {
  try {
    // The server receives the raw text content from the client.
    const { content } = await req.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Invalid content provided' }, { status: 400 });
    }

    // It then calls the Genkit flow to perform the summarization.
    const summary = await summarizeText(content);

    // Finally, it returns the AI-generated summary to the client.
    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Error in summarize-document API route:', error);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}
