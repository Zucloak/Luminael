
'use server';
/**
 * @fileOverview A utility to validate a Gemini API key by making a direct REST call,
 * bypassing the Genkit framework to ensure stability.
 */

import { z } from 'zod';

export const ValidateApiKeyInputSchema = z.object({
  apiKey: z.string().describe('The Gemini API key to validate.'),
});
export type ValidateApiKeyInput = z.infer<typeof ValidateApiKeyInputSchema>;

export const ValidateApiKeyOutputSchema = z.object({
  success: z.boolean().describe('Whether the API key is valid.'),
  error: z.string().optional().describe('The error message if the key is invalid.'),
});
export type ValidateApiKeyOutput = z.infer<typeof ValidateApiKeyOutputSchema>;

export async function validateApiKey(input: ValidateApiKeyInput): Promise<ValidateApiKeyOutput> {
  const { apiKey } = input;

  if (!apiKey || !apiKey.trim()) {
    return { success: false, error: 'API key cannot be empty.' };
  }

  // Use the REST API directly to avoid any potential conflicts with the Genkit framework initialization
  // that have been causing persistent server crashes.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // A minimal payload to test the key's validity
        contents: [{ parts: [{ text: 'Verify key' }] }],
        generationConfig: {
            maxOutputTokens: 1,
        }
      }),
    });

    const data = await response.json();

    if (!response.ok) {
        let errorMessage = 'The provided API key is invalid or has insufficient permissions.';
        
        // Extract the specific error message from the Google API response
        if (data?.error?.message) {
            errorMessage = data.error.message;
        }
        
        // Provide more user-friendly messages for common errors
        if (errorMessage.includes('API key not valid')) {
            errorMessage = 'The provided API key is not valid. Please check for typos and try again.';
        } else if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
            errorMessage = 'The API key is valid, but it does not have permission to use the Generative Language API. Please enable it in your Google Cloud console.';
        } else if (errorMessage.includes('quota')) {
            errorMessage = 'Your project has exceeded its quota for the Generative Language API. Please check your Google Cloud console.';
        }

        return { success: false, error: errorMessage };
    }
    
    // As a final check, ensure the response structure is what we expect for a successful call.
    if (!data.candidates || !Array.isArray(data.candidates)) {
        return { success: false, error: 'The API key seems valid, but the API returned an unexpected response format. Please try again.' };
    }

    // If the call succeeds and the response is structured correctly, the key is valid.
    return { success: true };
  } catch (error: any) {
    console.error('API Key validation fetch failed:', error);
    
    // Handle network errors (e.g., no internet connection)
    let errorMessage = 'Could not connect to the server to verify the key. Please check your internet connection and firewall settings.';
    if (error.cause) {
        errorMessage = `Network error: ${error.cause.code || error.cause.message || 'Unknown'}`;
    }
    return { success: false, error: errorMessage };
  }
}
