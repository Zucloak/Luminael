// src/ai/flows/generate-quiz.ts
'use server';
/**
 * @fileOverview Generates a quiz based on user-uploaded content.
 *
 * - generateQuiz - A function that generates a quiz from content.
 * - GenerateQuizInput - The input type for the generateQuiz function.
 * - GenerateQuizOutput - The return type for the generateQuiz function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateQuizInputSchema = z.object({
  content: z.string().describe('The content to generate the quiz from.'),
  numQuestions: z.number().describe('The number of questions to generate.'),
  topics: z.string().describe('The topics to cover in the quiz.'),
  difficulty: z.string().describe('The difficulty level of the quiz.'),
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

const QuestionSchema = z.object({
    question: z.string().describe('The question text.'),
    options: z.array(z.string()).describe('An array of 4 multiple-choice options.'),
    answer: z.string().describe('The correct answer, which must be one of the provided options.'),
});

const GenerateQuizOutputSchema = z.object({
  quiz: z.object({
      questions: z.array(QuestionSchema),
  }).describe('The generated quiz.'),
});
export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;

export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  return generateQuizFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuizPrompt',
  input: {schema: GenerateQuizInputSchema},
  output: {schema: GenerateQuizOutputSchema},
  prompt: `You are a helpful AI assistant that generates multiple choice quizzes.

  Based on the following content, please generate a quiz with {{numQuestions}} questions.
  The quiz should cover the topics of '{{topics}}' at a '{{difficulty}}' difficulty level.

  For each question, provide exactly 4 multiple-choice options.
  One of these options must be the correct answer.

  Ensure the output is a JSON object that strictly follows the provided schema. The 'answer' for each question must be one of the strings from the 'options' array.

  Content:
  """
  {{{content}}}
  """`,
});

const generateQuizFlow = ai.defineFlow(
  {
    name: 'generateQuizFlow',
    inputSchema: GenerateQuizInputSchema,
    outputSchema: GenerateQuizOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
