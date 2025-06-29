'use server';

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import fs from 'fs';
import path from 'path';

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
    const extractTextPrompt = fs.readFileSync(
      path.join(process.cwd(), 'src', 'ai', 'prompts', 'extractTextFromImage.prompt'),
      'utf8'
    );
    
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
