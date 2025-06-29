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
import fs from 'fs';
import path from 'path';

export const ValidateAnswerInputSchema = z.object({
  question: z.string().describe("The original quiz question."),
  userAnswer: z.string().describe("The answer provided by the user."),
  correctAnswer: z.string().describe("The reference correct answer for the question."),
  apiKey: z.string().optional().describe('Optional Gemini API key.'),
});
export type ValidateAnswerInput = z.infer<typeof ValidateAnswerInputSchema>;

export const ValidateAnswerOutputSchema = z.object({
  status: z.enum(['Correct', 'Partially Correct', 'Incorrect']).describe("The validation status of the user's answer."),
  explanation: z.string().describe("A brief explanation for the validation status, providing constructive feedback to the user. All mathematical notation MUST be properly formatted in LaTeX and enclosed in single ($...$) or double ($$...$$) dollar signs."),
});
export type ValidateAnswerOutput = z.infer<typeof ValidateAnswerOutputSchema>;

// This schema is for the prompt itself, excluding the API key.
const ValidateAnswerPromptInputSchema = z.object({
    question: z.string().describe("The original quiz question."),
    userAnswer: z.string().describe("The answer provided by the user."),
    correctAnswer: z.string().describe("The reference correct answer for the question."),
});

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
    const promptTemplate = fs.readFileSync(
      path.join(process.cwd(), 'src', 'ai', 'prompts', 'validateAnswer.prompt'),
      'utf8'
    );

    const { apiKey, ...promptInput } = input;
    const runner = apiKey
      ? genkit({
          plugins: [googleAI({apiKey})],
          model: 'googleai/gemini-2.0-flash',
        })
      : ai;

    const prompt = runner.definePrompt({
        name: 'validateAnswerPrompt',
        input: {schema: ValidateAnswerPromptInputSchema},
        output: {schema: ValidateAnswerOutputSchema},
        prompt: promptTemplate,
    });

    const {output} = await prompt(promptInput);
    
    if (!output) {
      throw new Error("AI validation failed. The model did not return a response, possibly due to content safety filters or an internal error.");
    }
    
    return output;
  }
);
