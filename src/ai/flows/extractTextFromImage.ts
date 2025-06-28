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
  async ({ imageDataUrl, apiKey }) => {
    const runner = apiKey
      ? genkit({
          plugins: [googleAI({apiKey})],
          model: 'googleai/gemini-2.0-flash',
        })
      : ai;
    
    const { text } = await runner.generate({
      prompt: [
        { text: 'Extract all text from the image. Provide only the extracted text, formatted as paragraphs. Do not include any commentary or preamble like "Here is the extracted text:".' },
        { media: { url: imageDataUrl } },
      ],
    });

    return text;
  }
);
