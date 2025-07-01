'use server';

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const ExtractTextFromImageInputSchema = z.object({
  imageDataUrl: z
    .string()
    .describe(
      "An image file encoded as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  localOcrAttempt: z.string().optional().describe("The (potentially flawed) text extracted by a local OCR tool."),
  apiKey: z.string().optional().describe('Optional Gemini API key.'),
});
type ExtractTextFromImageInput = z.infer<typeof ExtractTextFromImageInputSchema>;

export async function extractTextFromImage(input: ExtractTextFromImageInput): Promise<string> {
  return extractTextFromImageFlow(input);
}

const extractTextFromImageFlow = ai.defineFlow(
  {
    name: 'extractTextFromImageFlow',
    inputSchema: ExtractTextFromImageInputSchema,
    outputSchema: z.string(),
  },
  async ({ imageDataUrl, localOcrAttempt, apiKey }) => {
    try {
      if (!imageDataUrl || !imageDataUrl.startsWith('data:image')) {
          return localOcrAttempt || '';
      }

      if (!apiKey || apiKey.trim() === '') {
        throw new Error("A valid API Key is required for extractTextFromImageFlow but was not provided or was empty.");
      }
      const runner = genkit({ plugins: [googleAI({apiKey})] });
      
      const { text } = await runner.generate({
        model: 'googleai/gemini-1.5-flash-latest',
        prompt: [
            { text: `You are an advanced OCR AI. Your task is to extract all text from the provided image with the highest possible accuracy.
A local OCR tool has already made an attempt, but it may be flawed. Use the local attempt as a hint, but trust the image as the primary source of truth.
Correct any errors you find in the local attempt. Output only the final, corrected text.

**Image to Process:**`},
            { media: { url: imageDataUrl } },
            { text: `
**Local OCR's Attempt:**
${localOcrAttempt || 'No local OCR attempt was made.'}

**Final, Corrected Text:` },
        ],
      });

      return text;
    } catch (error) {
        console.error("Critical error in extractTextFromImageFlow:", error);
        
        let message = "An unknown error occurred during text extraction.";
        if (error instanceof Error) {
            message = error.message;
        } else if (typeof error === 'string') {
            message = error;
        }
        
        // We throw the error so the client-side can catch it and display a toast.
        throw new Error(message);
    }
  }
);
