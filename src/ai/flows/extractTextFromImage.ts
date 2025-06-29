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

const ExtractTextFromImagePromptInputSchema = ExtractTextFromImageInputSchema.omit({apiKey: true});

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
    const extractTextPrompt = `You are an advanced OCR AI. Your task is to extract all text from the provided image with the highest possible accuracy.
A local OCR tool has already made an attempt, but it may be flawed. Use the local attempt as a hint, but trust the image as the primary source of truth.
Correct any errors you find in the local attempt. Output only the final, corrected text.

**Image to Process:**
{{media url=imageDataUrl}}

**Local OCR's Attempt:**
{{#if localOcrAttempt}}
{{localOcrAttempt}}
{{else}}
No local OCR attempt was made.
{{/if}}

**Final, Corrected Text:**`;
    
    const runner = apiKey
      ? genkit({
          plugins: [googleAI({apiKey})],
          model: 'googleai/gemini-2.0-flash',
        })
      : ai;
    
    const prompt = runner.definePrompt({
      name: 'extractTextFromImagePrompt',
      input: {schema: ExtractTextFromImagePromptInputSchema},
      prompt: extractTextPrompt,
    });
    
    const { text } = await prompt({imageDataUrl, localOcrAttempt});

    return text;
  }
);
