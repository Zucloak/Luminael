
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

const FileContentSchema = z.object({
  name: z.string().describe("The name of the file."),
  content: z.string().describe("The text content of the file."),
});

const GenerateQuizInputSchema = z.object({
  files: z.array(FileContentSchema)
    .describe('An array of files, each with a name and its text content.'),
  numQuestions: z.number().describe('The number of questions to generate for this batch.'),
  difficulty: z.string().describe('The difficulty level of the quiz.'),
  questionFormat: z.enum(['multipleChoice', 'openEnded', 'mixed']).describe("The desired format for the quiz questions."),
  existingQuestions: z.array(z.string()).optional().describe('A list of questions already generated, to avoid duplicates.'),
  apiKey: z.string().optional().describe('Optional Gemini API key.'),
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

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

const GenerateQuizOutputSchema = z.object({
  quiz: z.object({
      questions: z.array(QuestionSchema).refine(items => items.every(item => item.question.trim() !== '' && !item.question.toLowerCase().includes("lorem ipsum")), {
        message: 'Question text cannot be empty or placeholder text.',
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
  async ({ files, numQuestions, difficulty, questionFormat, existingQuestions, apiKey }) => {
    const runner = apiKey ? genkit({ plugins: [googleAI({apiKey})] }) : ai;
    
    const processedContent = files.map(file => 
      `# File: ${file.name}\n${file.content}`
    ).join('\n\n---\n\n');

    const conceptInstruction = files.length > 3
        ? 'For each document, identify a maximum of 5 key concepts.'
        : 'For each document, identify all relevant key concepts.';

    const quizPrompt = `You are an expert AI educator. Your task is to perform a two-step process:
First, analyze the provided **Core Material** which consists of one or more documents. ${conceptInstruction}
Second, using ONLY those key concepts you have identified, generate a quiz that meets the specified criteria.

**Core Material:**
${processedContent}

**NON-NEGOTIABLE RULES:**
1.  **Strictly Adhere to Content:** You are strictly forbidden from using any external knowledge. All key concepts, questions, options, and answers MUST be directly derived from the Core Material provided. The file structure (e.g., "# File: ...") is for context; synthesize information across files.
2.  **Obey the Language:** The entire quiz MUST be in the same language as the Core Material. If the content is in Filipino, the quiz must be in Filipino. No exceptions.
3.  **Generate Exactly ${numQuestions} Questions:** You are required to generate exactly the number of questions requested. Your generated questions must be based on the key concepts you identified.
4.  **No Placeholders or Garbage:** Under no circumstances are you to output placeholder text like "Lorem Ipsum" or generic, unrelated questions (e.g., "What is the capital of France?", "What is a quick brown fox?"). This is an instant failure.
5.  **Question Format:** Adhere to the requested format: '${questionFormat}'.
6.  **Difficulty:** Calibrate the questions to a '${difficulty}' level based on the content.
7.  **Avoid Duplicates:** Do not generate questions that are identical or too similar to these existing questions: ${existingQuestions && existingQuestions.length > 0 ? JSON.stringify(existingQuestions) : 'None'}.
8.  **Impeccable LaTeX Formatting:** For any mathematical equations or symbols, you MUST use proper LaTeX formatting.
    -   Enclose inline math with single dollar signs (\`$...$\`).
    -   Enclose block math with double dollar signs (\`$$...$$\`).
    -   **CRITICAL:** For multi-character superscripts or subscripts, you MUST use curly braces. For example: write \`$10^{-19}$\` NOT \`$10^-19$\`. Write \`$U_{235}$\` NOT \`$U_235$\`.
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
