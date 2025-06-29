
'use server';
/**
 * @fileOverview A flow to validate a Gemini API key.
 */

import { ai } from '@/ai/genkit';
import { genkit } from 'genkit';
import { z } from 'zod';
import { googleAI } from '@genkit-ai/googleai';

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
  return validateApiKeyFlow(input);
}

const validateApiKeyFlow = ai.defineFlow(
  {
    name: 'validateApiKeyFlow',
    inputSchema: ValidateApiKeyInputSchema,
    outputSchema: ValidateApiKeyOutputSchema,
  },
  async ({ apiKey }) => {
    if (!apiKey || !apiKey.trim()) {
      return { success: false, error: 'API key cannot be empty.' };
    }

    try {
      // Create a temporary Genkit runner with the user's key.
      const runner = genkit({
        plugins: [googleAI({ apiKey })],
      });

      // Perform a small, inexpensive test generation.
      await runner.generate({
        model: 'googleai/gemini-2.0-flash',
        prompt: 'Verify key.',
        config: {
          maxOutputTokens: 1, // We don't care about the output, just that it succeeds.
        }
      });

      // If the above line doesn't throw, the key is valid.
      return { success: true };
    } catch (e: any) {
      console.error('API Key validation failed:', e);
      
      let errorMessage = 'The provided API key is invalid or has insufficient permissions.';
      
      // Try to extract a more specific error message from Google's response
      if (e.cause?.message) {
        if (e.cause.message.includes('API key not valid')) {
            errorMessage = 'The provided API key is not valid. Please check for typos and try again.';
        } else if (e.cause.message.includes('permission')) {
            errorMessage = 'The API key is valid, but it does not have permission to use the Generative Language API. Please enable it in your Google Cloud console.';
        }
      }

      return { success: false, error: errorMessage };
    }
  }
);
