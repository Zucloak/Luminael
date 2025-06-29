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
import {z} from 'zod';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import fs from 'fs';
import path from 'path';

const GenerateQuizInputSchema = z.object({
  content: z.string().describe('The content to generate the quiz from, potentially covering multiple subjects.'),
  numQuestions: z.number().describe('The number of questions to generate for this batch.'),
  difficulty: z.string().describe('The difficulty level of the quiz.'),
  questionFormat: z.enum(['multipleChoice', 'openEnded', 'mixed']).describe("The desired format for the quiz questions."),
  existingQuestions: z.array(z.string()).optional().describe('A list of questions already generated, to avoid duplicates.'),
  apiKey: z.string().optional().describe('Optional Gemini API key.'),
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

// This schema is for the prompt itself, excluding the API key.
const GenerateQuizPromptInputSchema = GenerateQuizInputSchema.omit({ apiKey: true });

const MultipleChoiceQuestionSchema = z.object({
  questionType: z.enum(['multipleChoice']).describe("The type of the question."),
  question: z.string().describe('The question text.'),
  options: z.array(z.string()).length(4).describe('An array of 4 multiple-choice options.'),
  answer: z.string().describe('The correct answer, which must be one of the provided options.'),
});

const OpenEndedQuestionSchema = z.object({
  questionType: z.enum(['openEnded']).describe("The type of the question."),
  question: z.string().describe('The problem-solving or open-ended question.'),
  answer: z.string().describe('The detailed, correct solution to the problem.'),
});

const QuestionSchema = z.union([MultipleChoiceQuestionSchema, OpenEndedQuestionSchema]);

const GenerateQuizOutputSchema = z.object({
  quiz: z.object({
      questions: z.array(QuestionSchema),
  }).describe('The generated quiz.'),
});
export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;

export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  return generateQuizFlow(input);
}

const generateQuizFlow = ai.defineFlow(
  {
    name: 'generateQuizFlow',
    inputSchema: GenerateQuizInputSchema,
    outputSchema: GenerateQuizOutputSchema,
  },
  async (input) => {
    const quizPromptTemplate = fs.readFileSync(
      path.join(process.cwd(), 'src', 'ai', 'prompts', 'generateQuiz.prompt'),
      'utf8'
    );
    
    const summarizePromptTemplate = fs.readFileSync(
      path.join(process.cwd(), 'src', 'ai', 'prompts', 'summarizeContent.prompt'),
      'utf8'
    );

    const {apiKey, ...promptInput} = input;
    const runner = apiKey
      ? genkit({
          plugins: [googleAI({apiKey})],
          model: 'googleai/gemini-2.0-flash',
        })
      : ai;

    const CONTENT_THRESHOLD = 20000;
    let processedContent = input.content;

    if (processedContent.length > CONTENT_THRESHOLD) {
      const { text } = await runner.generate({
        prompt: summarizePromptTemplate.replace('{{{content}}}', processedContent),
      });
      processedContent = text;
    }
    
    const prompt = runner.definePrompt({
      name: 'generateQuizPrompt',
      input: {schema: GenerateQuizPromptInputSchema},
      output: {schema: GenerateQuizOutputSchema},
      prompt: quizPromptTemplate,
    });

    const {output} = await prompt({...promptInput, content: processedContent});
    return output!;
  }
);
