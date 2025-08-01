import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Define schemas and validation logic directly within the API route
// to make it fully self-contained and prevent framework conflicts.

const ValidateApiKeyInputSchema = z.object({
  apiKey: z.string().describe('The Gemini API key to validate.'),
});
type ValidateApiKeyInput = z.infer<typeof ValidateApiKeyInputSchema>;

const ValidateApiKeyOutputSchema = z.object({
  success: z.boolean().describe('Whether the API key is valid.'),
  error: z.string().optional().describe('The error message if the key is invalid.'),
});
type ValidateApiKeyOutput = z.infer<typeof ValidateApiKeyOutputSchema>;

async function performApiKeyValidation(input: ValidateApiKeyInput): Promise<ValidateApiKeyOutput> {
  const { apiKey } = input;

  if (!apiKey || !apiKey.trim()) {
    return { success: false, error: 'API key cannot be empty.' };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Verify key' }] }],
        generationConfig: {
            maxOutputTokens: 1,
        }
      }),
    });

    const data = await response.json();

    if (!response.ok) {
        let errorMessage = 'The provided API key is invalid or has insufficient permissions.';
        
        if (data?.error?.message) {
            errorMessage = data.error.message;
        }
        
        if (errorMessage.includes('API key not valid')) {
            errorMessage = 'The provided API key is not valid. Please check for typos and try again.';
        } else if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
            errorMessage = 'The API key is valid, but it does not have permission to use the Generative Language API. Please enable it in your Google Cloud console.';
        } else if (errorMessage.includes('quota')) {
            errorMessage = 'Your project has exceeded its quota for the Generative Language API. Please check your Google Cloud console.';
        }

        return { success: false, error: errorMessage };
    }
    
    if (!data.candidates || !Array.isArray(data.candidates)) {
        return { success: false, error: 'The API key seems valid, but the API returned an unexpected response format. Please try again.' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('API Key validation fetch failed:', error);
    
    let errorMessage = 'Could not connect to the server to verify the key. Please check your internet connection and firewall settings.';
    if (error.cause) {
        errorMessage = `Network error: ${error.cause.code || error.cause.message || 'Unknown'}`;
    }
    return { success: false, error: errorMessage };
  }
}

export async function POST(req: NextRequest) {
  try {
    // SECURITY WARNING: Public Unprotected Endpoint
    // This endpoint is public and lacks any form of rate-limiting or bot protection.
    // This makes it vulnerable to Denial of Service (DoS) attacks and abuse, where an attacker
    // can bombard the endpoint with requests, consuming serverless resources and incurring costs.
    // It can also be used as a free proxy to validate lists of stolen API keys.
    //
    // RECOMMENDATION:
    // 1. Implement Rate Limiting: Use a service like Upstash (https://upstash.com/docs/redis/features/rate-limiting)
    //    to limit the number of requests per IP address or user to a reasonable threshold (e.g., 10 requests/minute).
    // 2. Add a CAPTCHA: Integrate a service like hCaptcha or Google reCAPTCHA on the front-end form
    //    that calls this endpoint. The CAPTCHA token should be verified by this serverless function
    //    before proceeding with the API key validation. This prevents automated bot attacks.
    const { apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API key is required' }, { status: 400 });
    }

    const input: ValidateApiKeyInput = { apiKey };
    const result = await performApiKeyValidation(input);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Critical unhandled error in validate-api-key API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred';
    return NextResponse.json({ success: false, error: 'A critical error occurred while trying to validate the API key.', details: errorMessage }, { status: 500 });
  }
}
