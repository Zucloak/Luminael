'use server';
/**
 * @fileOverview Extracts text from an image using AI.
 *
 * - extractTextFromImage - A function that handles the OCR process.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractTextFromImageInputSchema = z.object({
  imageDataUrl: z
    .string()
    .describe(
      "An image file encoded as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractTextFromImageInput = z.infer<typeof ExtractTextFromImageInputSchema>;

export async function extractTextFromImage(input: ExtractTextFromImageInput): Promise<string> {
  return extractTextFromImageFlow(input);
}

const extractTextFromImageFlow = ai.defineFlow(
  {
    name: 'extractTextFromImageFlow',
    inputSchema: ExtractTextFromImageInputSchema,
    outputSchema: z.string(),
  },
  async ({ imageDataUrl }) => {
    // Use a multimodal model capable of processing images.
    const model = 'googleai/gemini-1.5-flash-latest';
    
    const { text } = await ai.generate({
      model: model,
      prompt: [
        { text: 'Extract all text from the image. Provide only the extracted text, formatted as paragraphs. Do not include any commentary or preamble like "Here is the extracted text:".' },
        { media: { url: imageDataUrl } },
      ],
    });

    return text;
  }
);
