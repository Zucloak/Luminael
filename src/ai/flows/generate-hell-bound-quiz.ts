'use server';
/**
 * @fileOverview AI agent that generates a super difficult quiz related to the uploaded files.
 *
 * - generateHellBoundQuiz - A function that handles the quiz generation process.
 * - GenerateHellBoundQuizInput - The input type for the generateHellBoundQuiz function.
 * - GenerateHellBoundQuizOutput - The return type for the generateHellBoundQuiz function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import fs from 'fs';
import path from 'path';

const GenerateHellBoundQuizInputSchema = z.object({
  fileContent: z
    .string()
    .describe('The content of the uploaded files, which may span multiple subjects.'),
  numQuestions: z.number().describe('The number of questions to generate for this batch.'),
  existingQuestions: z.array(z.string()).optional().describe('A list of questions already generated, to avoid duplicates.'),
  apiKey: z.string().optional().describe('Optional Gemini API key.'),
});
export type GenerateHellBoundQuizInput = z.infer<typeof GenerateHellBoundQuizInputSchema>;

// This schema is for the prompt itself, excluding the API key.
const GenerateHellBoundQuizPromptInputSchema = GenerateHellBoundQuizInputSchema.omit({ apiKey: true });

const MultipleChoiceQuestionSchema = z.object({
  questionType: z.enum(['multipleChoice']).describe("The type of the question."),
  question: z.string().describe('The question text. All mathematical notation MUST be properly formatted in LaTeX and enclosed in single ($...$) or double ($$...$$) dollar signs for rendering.'),
  options: z.array(z.string().describe('A multiple-choice option. All mathematical notation MUST be properly formatted in LaTeX and enclosed in single ($...$) or double ($$...$$) dollar signs.')).length(4).describe('An array of 4 multiple-choice options.'),
  answer: z.string().describe('The correct answer, which must be one of the provided options. All mathematical notation MUST be properly formatted in LaTeX and enclosed in single ($...$) or double ($$...$$) dollar signs.'),
});

const OpenEndedQuestionSchema = z.object({
  questionType: z.enum(['openEnded']).describe("The type of the question."),
  question: z.string().describe('The problem-solving or open-ended question. All mathematical notation MUST be properly formatted in LaTeX and enclosed in single ($...$) or double ($$...$$) dollar signs for rendering.'),
  answer: z.string().describe('The detailed, correct solution to the problem. All mathematical notation MUST be properly formatted in LaTeX and enclosed in single ($...$) or double ($$...$$) dollar signs.'),
});

const QuestionSchema = z.union([MultipleChoiceQuestionSchema, OpenEndedQuestionSchema]);


const GenerateHellBoundQuizOutputSchema = z.object({
  quiz: z.object({
      questions: z.array(QuestionSchema),
  }).describe('The generated quiz.'),
});
export type GenerateHellBoundQuizOutput = z.infer<typeof GenerateHellBoundQuizOutputSchema>;

export async function generateHellBoundQuiz(input: GenerateHellBoundQuizInput): Promise<GenerateHellBoundQuizOutput> {
  return generateHellBoundQuizFlow(input);
}

const generateHellBoundQuizFlow = ai.defineFlow(
  {
    name: 'generateHellBoundQuizFlow',
    inputSchema: GenerateHellBoundQuizInputSchema,
    outputSchema: GenerateHellBoundQuizOutputSchema,
  },
  async (input) => {
    const quizPromptTemplate = fs.readFileSync(
      path.join(process.cwd(), 'src', 'ai', 'prompts', 'generateHellBoundQuiz.prompt'),
      'utf8'
    );
    
    const summarizePromptTemplate = fs.readFileSync(
      path.join(process.cwd(), 'src', 'ai', 'prompts', 'summarizeContentHellBound.prompt'),
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
    let processedContent = input.fileContent;

    if (processedContent.length > CONTENT_THRESHOLD) {
      const { text } = await runner.generate({
        prompt: summarizePromptTemplate.replace('{{{fileContent}}}', processedContent),
      });
      processedContent = text;
    }

    const prompt = runner.definePrompt({
      name: 'generateHellBoundQuizPrompt',
      input: {schema: GenerateHellBoundQuizPromptInputSchema},
      output: {schema: GenerateHellBoundQuizOutputSchema},
      prompt: quizPromptTemplate,
    });


    const {output} = await prompt({...promptInput, fileContent: processedContent});
    return output!;
  }
);
