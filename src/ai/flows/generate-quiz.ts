
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
  context: z.string().describe("A structured Markdown string containing key concepts from one or more documents."),
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
  async ({ context, numQuestions, difficulty, questionFormat, existingQuestions, apiKey }) => {
    try {
        const runner = apiKey ? genkit({ plugins: [googleAI({apiKey})] }) : ai;

        const quizPrompt = `You are an expert AI educator. Your task is to generate a quiz based on the **Key Concepts** provided below.

**Key Concepts:**
${context}

**NON-NEGOTIABLE RULES:**
1.  **Strictly Adhere to Content:** You are strictly forbidden from using any external knowledge. All questions, options, and answers MUST be directly derived from the Key Concepts provided.
2.  **Obey the Language:** The entire quiz MUST be in the same language as the Key Concepts.
3.  **Generate Exactly ${numQuestions} Questions:** You are required to generate exactly the number of questions requested.
4.  **Question Format:** Adhere to the requested format: '${questionFormat}'.
5.  **Question Type Integrity:** If a question is inherently explanatory or requires a detailed answer (e.g., starts with "Explain...", "Describe...", "Why..."), you MUST classify it as 'openEnded', even if the requested format is 'multipleChoice'. Do not force an explanatory question into a multiple-choice structure.
6.  **No Placeholders or Garbage:** All fields (question, options, answer) MUST contain meaningful, relevant content. Do not use generic placeholders like "string", "option A", "Lorem Ipsum", or "correct answer". For multiple-choice questions, all four options must be distinct and plausible.
7.  **Difficulty:** Calibrate the questions to a '${difficulty}' level.
8.  **Avoid Duplicates:** Do not generate questions that are identical or too similar to these existing questions: ${existingQuestions && existingQuestions.length > 0 ? JSON.stringify(existingQuestions) : 'None'}.
9.  **Impeccable LaTeX Formatting:** For any mathematical equations or symbols, you MUST use proper LaTeX formatting.
    -   Enclose inline math with single dollar signs (\`$...$\`).
    -   Enclose block math with double dollar signs (\`$$...$$\`).
    -   **CRITICAL:** For ALL superscripts or subscripts, you MUST use curly braces, even for single characters. For example: write \`$z^{6}$\` NOT \`$z^6$\`. Write \`$x^{2}$\` NOT \`$x^2$\`. Write \`$10^{-19}$\` NOT \`$10^-19$\`.
    -   Use standard LaTeX commands for functions and symbols (e.g., \`\\sin\`, \`\\cos\`, \`\\theta\`, \`\\alpha\`, \`\\sqrt{}\`, \`\\frac{}{}\`). For example, write \`$x = a \\sin \\theta$\` instead of \`x = a sin θ\`.
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
        
        if (!output) {
          throw new Error("The AI failed to generate a quiz. It returned an empty or invalid response.");
        }
        return output;
    } catch (error) {
        console.error("Critical error in generateQuizFlow:", error);
        let message = "An unknown error occurred during quiz generation.";
        if (error instanceof Error) {
            if (error.message.includes('503 Service Unavailable') || error.message.includes('overloaded')) {
                message = "The AI model is temporarily overloaded. Please wait a moment and try again.";
            } else {
                message = error.message;
            }
        } else if (typeof error === 'string') {
            message = error;
        }
        throw new Error(message);
    }
  }
);
