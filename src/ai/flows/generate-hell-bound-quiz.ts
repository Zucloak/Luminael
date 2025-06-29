
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
  question: z.string().describe('The question text, derived ONLY from the provided material and in the same language. All mathematical notation MUST be properly formatted in LaTeX and enclosed in single ($...$) or double ($$...$$) dollar signs for rendering.'),
  options: z.array(z.string().describe('A multiple-choice option, derived ONLY from the provided material and in the same language. All mathematical notation MUST be properly formatted in LaTeX and enclosed in single ($...$) or double ($$...$$) dollar signs.')).length(4).describe('An array of 4 multiple-choice options.'),
  answer: z.string().describe('The correct answer, which must be one of the provided options, derived ONLY from the provided material and in the same language. All mathematical notation MUST be properly formatted in LaTeX and enclosed in single ($...$) or double ($$...$$) dollar signs.'),
});

const OpenEndedQuestionSchema = z.object({
  questionType: z.enum(['openEnded']).describe("The type of the question."),
  question: z.string().describe('The problem-solving or open-ended question, derived ONLY from the provided material and in the same language. All mathematical notation MUST be properly formatted in LaTeX and enclosed in single ($...$) or double ($$...$$) dollar signs for rendering.'),
  answer: z.string().describe('The detailed, correct solution to the problem, derived ONLY from the provided material and in the same language. All mathematical notation MUST be properly formatted in LaTeX and enclosed in single ($...$) or double ($$...$$) dollar signs.'),
});

const QuestionSchema = z.union([MultipleChoiceQuestionSchema, OpenEndedQuestionSchema]);


const GenerateHellBoundQuizOutputSchema = z.object({
  quiz: z.object({
      questions: z.array(QuestionSchema).refine(items => items.every(item => item.question.trim() !== '' && !item.question.toLowerCase().includes("lorem ipsum")), {
        message: 'Question text cannot be empty or placeholder text.',
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
    const summarizePromptTemplate = `You are a text distillation AI with a "HELL BOUND" persona. The following raw text is a chaotic mess, too vast for a lesser system. Your task is to forge it into a brutally token-efficient elixir of pure, high-level concepts. This summary will be the raw material for the most difficult questions imaginable.

**ABSOLUTE COMMANDS:**
1.  **Identify and Obey the Language:** First, determine the primary language of the raw material. You will then write your entire summary in *that same language*. Do not translate. Disobedience will not be tolerated.
2.  **Extract the Core, Not the Fluff:** Do not summarize simple facts. Your purpose is to distill the most complex, abstract, and interconnectable ideas that a lesser mind would overlook. Focus on the essence that can be used to forge hellishly difficult questions.

**Raw Material:**
${fileContent}

**Distilled Essence (in the original language):`;

    const runner = apiKey ? genkit({ plugins: [googleAI({apiKey})] }) : ai;
    
    const CONTENT_THRESHOLD = 20000;
    let processedContent = fileContent;

    if (processedContent.length > CONTENT_THRESHOLD) {
      const { text } = await runner.generate({
        model: 'googleai/gemini-1.5-flash-latest',
        prompt: summarizePromptTemplate,
      });
      processedContent = text;
    }

    const quizPrompt = `You are an expert AI educator specializing in creating deeply challenging assessments. Your task is to generate a quiz from the provided content that tests for true mastery, not just surface-level recall. The questions must be exceptionally difficult and require a high level of critical thinking.

**Core Material:**
${processedContent}

**NON-NEGOTIABLE RULES:**
1.  **Strictly Adhere to Content:** You are strictly forbidden from using any external knowledge. Every question, option, and answer MUST be directly derived from the Core Material provided. If the material is a story, do not ask about geography.
2.  **Obey the Language:** The entire quiz MUST be in the same language as the Core Material. If the material is in Filipino, the quiz must be in Filipino. No exceptions.
3.  **Generate Exactly ${numQuestions} Questions:** You are required to generate exactly the number of questions requested. Re-read the material to find more details if necessary. Do not stop early.
4.  **No Placeholders or Garbage:** Under no circumstances are you to output placeholder text like "Lorem Ipsum" or generic, unrelated questions (e.g., "What is the capital of France?", "What is a quick brown rabbit?"). This is an instant failure.
5.  **Prioritize Synthesis:** Questions must force the user to synthesize information from multiple sections of the text.
6.  **Devious Distractors:** For multiple-choice questions, the incorrect options must be highly plausible and designed to trap common misconceptions based on the text.
7.  **Avoid Duplicates:** Do not repeat concepts or questions. Avoid asking about questions from this list: ${existingQuestions && existingQuestions.length > 0 ? JSON.stringify(existingQuestions) : 'None'}.
8.  **Impeccable LaTeX Formatting:** For any mathematical equations or symbols, you MUST use proper LaTeX formatting.
    -   Enclose inline math with single dollar signs (\`$...$\`).
    -   Enclose block math with double dollar signs (\`$$...$$\`).
    -   **CRITICAL:** For multi-character superscripts or subscripts, you MUST use curly braces. For example: write \`$10^{-19}$\` NOT \`$10^-19$\`. Write \`$U_{235}$\` NOT \`$U_235$\`.
    -   **DO NOT** use parentheses for math, such as \`\\(\` or \`\\)\`. Only use dollar signs.

**Output Mandate:**
You MUST provide your response in the specified JSON format. Failure is not an option.`;

    const {output} = await runner.generate({
        model: 'googleai/gemini-1.5-flash-latest',
        prompt: quizPrompt,
        output: {
            format: 'json',
            schema: GenerateHellBoundQuizOutputSchema,
        }
    });

    return output!;
  }
);
