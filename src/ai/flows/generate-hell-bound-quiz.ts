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

const GenerateHellBoundQuizInputSchema = z.object({
  fileContent: z
    .string()
    .describe('The content of the uploaded files, which may span multiple subjects.'),
  numQuestions: z.number().describe('The number of questions to generate for this batch.'),
  existingQuestions: z.array(z.string()).optional().describe('A list of questions already generated, to avoid duplicates.'),
  apiKey: z.string().optional().describe('Optional Gemini API key.'),
});
export type GenerateHellBoundQuizInput = z.infer<typeof GenerateHellBoundQuizInputSchema>;


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
        prompt: `Summarize the following text concisely, retaining all key facts, names, dates, concepts, and especially any subtle or tricky details. The goal is to reduce length while preserving the core information needed for a very difficult quiz. Only provide the summary, with no extra commentary or introduction. \n\nTEXT: ${processedContent}`,
      });
      processedContent = text;
    }

    const prompt = runner.definePrompt({
      name: 'generateHellBoundQuizPrompt',
      input: {schema: GenerateHellBoundQuizInputSchema},
      output: {schema: GenerateHellBoundQuizOutputSchema},
      prompt: `You are an AI quiz generator that specializes in creating extremely difficult, tricky, and nuanced quizzes based on provided content which may span multiple subjects.

      Your task is to generate a quiz with {{numQuestions}} questions based on the following content. The questions should be a mix of multiple-choice and open-ended problem-solving questions, designed to catch someone who has only skimmed the material and reward those with a deep, precise understanding. The questions should be randomly drawn from all topics found in the content.

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

      - For multiple-choice questions, provide exactly 4 options. One of these options must be the correct answer. Use subtle details, exceptions, and "all of the above" / "none of the above" style questions.
      - For open-ended questions, pose a complex problem that requires synthesis of information from the text, and provide a detailed, expert-level solution as the answer.

      Ensure the output is a JSON object that strictly follows the provided schema.

      Content:
      """
      {{{fileContent}}}
      """
      `,
    });


    const {output} = await prompt({...promptInput, fileContent: processedContent});
    return output!;
  }
);
