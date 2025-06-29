import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, ValidateApiKeyInput } from '@/ai/flows/validate-api-key';

export async function POST(req: NextRequest) {
  try {
    const { apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API key is required' }, { status: 400 });
    }

    const input: ValidateApiKeyInput = { apiKey };
    const result = await validateApiKey(input);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in validate-api-key API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: 'Failed to validate API key', details: errorMessage }, { status: 500 });
  }
}
