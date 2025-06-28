'use server';
/**
 * @fileOverview AI agent that validates a user's answer to an open-ended question.
 *
 * - validateAnswer - A function that handles the answer validation.
 * - ValidateAnswerInput - The input type for the validateAnswer function.
 * - ValidateAnswerOutput - The return type for the validateAnswer function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ValidateAnswerInputSchema = z.object({
  question: z.string().describe("The original quiz question."),
  userAnswer: z.string().describe("The answer provided by the user."),
  correctAnswer: z.string().describe("The reference correct answer for the question."),
  apiKey: z.string().optional().describe('Optional Gemini API key.'),
});
export type ValidateAnswerInput = z.infer<typeof ValidateAnswerInputSchema>;

export const ValidateAnswerOutputSchema = z.object({
  status: z.enum(['Correct', 'Partially Correct', 'Incorrect']).describe("The validation status of the user's answer."),
  explanation: z.string().describe("A brief explanation for the validation status, providing constructive feedback to the user."),
});
export type ValidateAnswerOutput = z.infer<typeof ValidateAnswerOutputSchema>;

export async function validateAnswer(input: ValidateAnswerInput): Promise<ValidateAnswerOutput> {
  return validateAnswerFlow(input);
}

const validateAnswerFlow = ai.defineFlow(
  {
    name: 'validateAnswerFlow',
    inputSchema: ValidateAnswerInputSchema,
    outputSchema: ValidateAnswerOutputSchema,
  },
  async (input) => {
    const { apiKey } = input;
    const runner = apiKey
      ? genkit({
          plugins: [googleAI({apiKey})],
          model: 'googleai/gemini-2.0-flash',
        })
      : ai;

    const prompt = runner.definePrompt({
        name: 'validateAnswerPrompt',
        input: {schema: ValidateAnswerInputSchema},
        output: {schema: ValidateAnswerOutputSchema},
        prompt: `You are an expert quiz validator. Your task is to assess a user's answer to a question against the provided correct answer.

        Question:
        """
        {{{question}}}
        """

        Correct Answer:
        """
        {{{correctAnswer}}}
        """

        User's Answer:
        """
        {{{userAnswer}}}
        """

        Based on the comparison, determine if the user's answer is "Correct", "Partially Correct", or "Incorrect".

        - "Correct": The user's answer fully aligns with the correct answer, demonstrating a complete understanding.
        - "Partially Correct": The user's answer contains some correct elements but is missing key information, contains inaccuracies, or shows a partial misunderstanding.
        - "Incorrect": The user's answer is fundamentally wrong or misses the main point entirely.

        Provide a brief, constructive explanation for your assessment to help the user learn. The explanation should be concise and directly address why the answer was graded as it was. For example, if partially correct, explain what was right and what was missing.

        Ensure your output is a JSON object that strictly follows the provided schema.`,
    });

    const {output} = await prompt(input);
    return output!;
  }
);
