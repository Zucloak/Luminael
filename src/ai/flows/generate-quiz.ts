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

const GenerateQuizInputSchema = z.object({
  content: z.string().describe('The content to generate the quiz from, potentially covering multiple subjects.'),
  numQuestions: z.number().describe('The number of questions to generate for this batch.'),
  difficulty: z.string().describe('The difficulty level of the quiz.'),
  questionFormat: z.enum(['multipleChoice', 'openEnded', 'mixed']).describe("The desired format for the quiz questions."),
  existingQuestions: z.array(z.string()).optional().describe('A list of questions already generated, to avoid duplicates.'),
  apiKey: z.string().optional().describe('Optional Gemini API key.'),
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

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
        prompt: `Summarize the following text concisely, retaining all key facts, names, dates, and concepts. The goal is to reduce length while preserving the core information needed for a quiz. Only provide the summary, with no extra commentary or introduction. \n\nTEXT: ${processedContent}`,
      });
      processedContent = text;
    }
    
    const prompt = runner.definePrompt({
      name: 'generateQuizPrompt',
      input: {schema: GenerateQuizInputSchema},
      output: {schema: GenerateQuizOutputSchema},
      prompt: `You are a helpful AI assistant that generates quizzes from diverse study materials. The user has uploaded content that may cover multiple different subjects.

      Your task is to create a quiz with {{numQuestions}} questions that are randomly selected and mixed from all the topics found in the provided content. This will help the user review material from across their subjects in a single session.
      The quiz should be at a '{{difficulty}}' difficulty level.

      IMPORTANT: For any mathematical content, you must use proper LaTeX syntax.
      - Wrap all inline mathematical expressions with single dollar signs (e.g., $E=mc^2$).
      - Wrap all block-level equations with double dollar signs (e.g., $$ \int_a^b f(x) \\,dx $$).
      - Use LaTeX commands for all mathematical symbols. For example:
        - Use \`\\int\` for integrals, not "int".
        - Use \`\\frac{a}{b}\` for fractions, not "a/b".
        - Use \`\\sqrt{x}\` for square roots.
        - Use \`\\sum\` for summations.
        - Use \`\\lim\` for limits.
      - Ensure that all special characters within LaTeX are correctly escaped if necessary.

      {{#if existingQuestions}}
      IMPORTANT: Do not generate questions that are the same as or very similar to the following questions that have already been created:
      {{#each existingQuestions}}
      - {{{this}}}
      {{/each}}
      {{/if}}

      The questions should be generated in the following format: '{{questionFormat}}'.
      - If 'multipleChoice', generate only multiple-choice questions.
      - If 'openEnded', generate only open-ended or problem-solving questions.
      - If 'mixed', generate a combination of both multiple-choice and open-ended questions.

      For 'multipleChoice' questions, provide exactly 4 options and a correct answer.
      For 'openEnded' questions, provide a detailed correct solution as the answer.

      Ensure the output is a JSON object that strictly follows the provided schema.

      Content:
      """
      {{{content}}}
      """`,
    });

    const {output} = await prompt({...promptInput, content: processedContent});
    return output!;
  }
);
