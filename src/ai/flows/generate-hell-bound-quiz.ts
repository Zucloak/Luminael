'use server';
/**
 * @fileOverview AI agent that generates a super difficult quiz related to the uploaded files.
 *
 * - generateHellBoundQuiz - A function that handles the quiz generation process.
 * - GenerateHellBoundQuizInput - The input type for the generateHellBoundQuiz function.
 * - GenerateHellBoundQuizOutput - The return type for the generateHellBoundQuiz function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateHellBoundQuizInputSchema = z.object({
  fileContent: z
    .string()
    .describe('The content of the uploaded file (txt, pdf, ppt).'),
  numQuestions: z.number().describe('The number of questions to generate.'),
});
export type GenerateHellBoundQuizInput = z.infer<typeof GenerateHellBoundQuizInputSchema>;

const GenerateHellBoundQuizOutputSchema = z.object({
  quiz: z.string().describe('The generated quiz in JSON format.'),
});
export type GenerateHellBoundQuizOutput = z.infer<typeof GenerateHellBoundQuizOutputSchema>;

export async function generateHellBoundQuiz(input: GenerateHellBoundQuizInput): Promise<GenerateHellBoundQuizOutput> {
  return generateHellBoundQuizFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateHellBoundQuizPrompt',
  input: {schema: GenerateHellBoundQuizInputSchema},
  output: {schema: GenerateHellBoundQuizOutputSchema},
  prompt: `You are an AI quiz generator that specializes in creating extremely difficult quizzes based on provided content.

  Your task is to generate a quiz with {{numQuestions}} questions based on the following content:

  {{fileContent}}

  The quiz should be challenging and designed to test the user's deep understanding of the material.

  The quiz should be returned in JSON format with a 'questions' array. Each question object should have a 'question' field and an 'answer' field.
  `,
});

const generateHellBoundQuizFlow = ai.defineFlow(
  {
    name: 'generateHellBoundQuizFlow',
    inputSchema: GenerateHellBoundQuizInputSchema,
    outputSchema: GenerateHellBoundQuizOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
