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

const GenerateQuizOutputSchema = z.object({
  quiz: z.object({
      questions: z.array(QuestionSchema).refine(items => items.every(item => item.question.trim() !== ''), {
        message: 'Question text cannot be empty.',
      }),
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
  async ({ content, numQuestions, difficulty, questionFormat, existingQuestions, apiKey }) => {
    const summarizePromptTemplate = `You are a text summarization AI. The following content is too long for direct processing and will exceed the token limit. Your task is to summarize it concisely. Focus on the key concepts, definitions, and important facts that are most suitable for creating quiz questions. Retain all essential information but drastically reduce the word count to ensure it's token-efficient.

**Original Content:**
${content}

**Summary:`;

    const runner = apiKey ? genkit({ plugins: [googleAI({apiKey})] }) : ai;
    
    const CONTENT_THRESHOLD = 20000;
    let processedContent = content;

    if (processedContent.length > CONTENT_THRESHOLD) {
      const { text } = await runner.generate({
        model: 'googleai/gemini-1.5-flash-latest',
        prompt: summarizePromptTemplate,
      });
      processedContent = text;
    }

    const quizPrompt = `You are an AI assistant tasked with creating a quiz based on the provided content.

**Content:**
${processedContent}

**Instructions:**
1.  **Analyze the Content:** Thoroughly read and understand the provided text.
2.  **Generate Questions:** Create exactly ${numQuestions} unique questions based on the content.
3.  **Question Format:** Adhere to the requested format: '${questionFormat}'.
    -   For 'multipleChoice', provide the question, 4 options, and the correct answer.
    -   For 'openEnded', provide a detailed problem or question and a comprehensive correct answer/solution.
    -   For 'mixed', create a variety of both types.
4.  **Difficulty:** Calibrate the questions to a '${difficulty}' level.
5.  **Avoid Duplicates:** Do not generate questions that are identical or too similar to these existing questions: ${existingQuestions && existingQuestions.length > 0 ? JSON.stringify(existingQuestions) : 'None'}.
6.  **Impeccable LaTeX Formatting:** For any mathematical equations or symbols, you MUST use proper LaTeX formatting.
    -   Enclose inline math with single dollar signs (\`$...$\`).
    -   Enclose block math with double dollar signs (\`$$...$$\`).
    -   **CRITICAL:** For multi-character superscripts or subscripts, you MUST use curly braces. For example: write \`$10^{-19}$\` NOT \`$10^-19$\`. Write \`$U_{235}$\` NOT \`$U_235$\`. This is essential for correct rendering.
    -   **DO NOT** use parentheses for math, such as \`\\(\` or \`\\)\`. Only use dollar signs.

**Output Format:**
You MUST provide your response in the specified JSON format.`;
    
    const {output} = await runner.generate({
      model: 'googleai/gemini-1.5-flash-latest',
      prompt: quizPrompt,
      output: {
          format: 'json',
          schema: GenerateQuizOutputSchema
      }
    });
    
    return output!;
  }
);
