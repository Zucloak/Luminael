'use server';
/**
 * @fileOverview A flow for summarizing text content.
 *
 * - summarizeText - A function that handles the text summarization.
 * - SummarizeTextInput - The input type for the summarizeText function.
 * - SummarizeTextOutput - The return type for the summarizeText function.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// The input is the raw text content of the document.
export const SummarizeTextInputSchema = z.string();
export type SummarizeTextInput = z.infer<typeof SummarizeTextInputSchema>;

// The output is the AI-generated summary.
export const SummarizeTextOutputSchema = z.string();
export type SummarizeTextOutput = z.infer<typeof SummarizeTextOutputSchema>;

/**
 * An exported wrapper function that calls the Genkit flow.
 * This is called by the Next.js API route.
 * @param documentContent The text content to summarize.
 * @returns The generated summary string.
 */
export async function summarizeText(documentContent: SummarizeTextInput): Promise<SummarizeTextOutput> {
  return await summarizeTextFlow(documentContent);
}

// Defines the Genkit flow for summarization.
const summarizeTextFlow = ai.defineFlow(
  {
    name: 'summarizeTextFlow',
    inputSchema: SummarizeTextInputSchema,
    outputSchema: SummarizeTextOutputSchema,
  },
  async (documentContent) => {
    // The AI is only used for this specific task.
    // It receives the pre-processed text, making it token-efficient.
    const { text } = await ai.generate({
      model: 'gemini-2.0-flash',
      prompt: `Summarize the following text concisely. Only provide the summary, with no extra commentary or introduction. \n\nTEXT: ${documentContent}`,
    });
    return text;
  }
);
