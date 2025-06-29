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
      questions: z.array(QuestionSchema).refine(items => items.every(item => item.question.trim() !== ''), {
        message: 'Question text cannot be empty.',
      }),
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
  async ({ fileContent, numQuestions, existingQuestions, apiKey }) => {
    const summarizePromptTemplate = `You are a text summarization AI with a "HELL BOUND" persona. The following raw text is too vast to be processed and will cause a token overflow. Your task is to distill this chaos into a concentrated elixir of pure, high-level concepts, making it brutally token-efficient. Do not summarize the simple facts; extract the most complex, abstract, and interconnectable ideas a lesser mind would overlook. This summary will be used to forge the most difficult questions imaginable.

**Raw Material:**
${fileContent}

**Distilled Essence:`;

    const runner = apiKey ? genkit({ plugins: [googleAI({apiKey})] }) : ai;
    const model = 'googleai/gemini-2.0-flash';

    const CONTENT_THRESHOLD = 20000;
    let processedContent = fileContent;

    if (processedContent.length > CONTENT_THRESHOLD) {
      const { text } = await runner.generate({
        model,
        prompt: summarizePromptTemplate,
      });
      processedContent = text;
    }

    const quizPrompt = `You are an expert AI educator specializing in creating deeply challenging assessments. Your task is to generate a quiz from the provided content that tests for true mastery, not just surface-level recall. The questions must be exceptionally difficult and require a high level of critical thinking.

**Core Material:**
${processedContent}

**Instructions for Generating High-Difficulty Questions:**
1.  **Prioritize Synthesis over Recall:** Do NOT ask simple "what is" questions. Your questions must force the user to synthesize information from multiple, potentially disparate sections of the provided text.
2.  **Test Second-Order Implications:** Generate questions that require the user to understand the consequences and implications of the concepts presented. For example, if the text explains concept A, ask how concept A would affect a novel situation B, which is not explicitly mentioned.
3.  **Focus on Nuance and Subtlety:** For conceptual or non-technical material (like literature, law, philosophy), your questions should probe for nuance, subtext, author's intent, and the subtle relationships between different arguments or ideas.
4.  **Target Edge Cases and Boundaries:** For technical material (like science, math, programming), questions should focus on edge cases, boundary conditions, and scenarios where rules might break or interact in non-obvious ways.
5.  **Create Devious Distractors (for Multiple Choice):** The incorrect options should be highly plausible and designed to trap common misconceptions. They should be "almost correct" answers, distinguishable from the right answer only by a critical detail found within the source material.
6.  **Demand Rigorous Solutions (for Open-Ended):** Problems should require a detailed, step-by-step argument, derivation, or explanation. The user should need to build a logical case, not just state a single fact.
7.  **Generate ${numQuestions} Unique Questions:** Do not repeat concepts or questions. Avoid asking about questions from this list: ${existingQuestions && existingQuestions.length > 0 ? JSON.stringify(existingQuestions) : 'None'}.
8.  **Impeccable LaTeX Formatting:** For any mathematical equations or symbols, you MUST use proper LaTeX formatting, enclosing inline math with single dollar signs ($...$) and block math with double dollar signs ($$...$$). This is critical for rendering.

**Output Mandate:**
You MUST provide your response in the specified JSON format. Failure is not an option.`;

    const {output} = await runner.generate({
        model,
        prompt: quizPrompt,
        output: {
            format: 'json',
            schema: GenerateHellBoundQuizOutputSchema,
        }
    });

    return output!;
  }
);
