import { NextRequest, NextResponse } from 'next/server';
import sanitizeHtml from 'sanitize-html';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { input } = body;

    if (typeof input !== 'string') {
      return NextResponse.json({ error: 'Input must be a string.' }, { status: 400 });
    }

    // Use default options which are quite strict and good for preventing XSS
    // Allows basic text formatting tags but strips scripts, styles, etc.
    const sanitized = sanitizeHtml(input);

    return NextResponse.json({ sanitized });
  } catch (error) {
    console.error('Sanitization API error:', error);
    return NextResponse.json({ error: 'An error occurred during sanitization.' }, { status: 500 });
  }
}
