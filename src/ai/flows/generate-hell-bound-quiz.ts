
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
  context: z.string().describe("A structured Markdown string containing key concepts from one or more documents."),
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
  async ({ context, numQuestions, existingQuestions, apiKey }) => {
    if (!apiKey) {
      throw new Error("API Key is required for generateHellBoundQuizFlow but was not provided.");
    }
    const runner = genkit({ plugins: [googleAI({apiKey})] });

    const quizPrompt = `You are an expert AI educator specializing in creating deeply challenging assessments. Your task is to use the provided **Key Concepts** to generate a quiz that tests for true mastery, not just surface-level recall. The questions must be exceptionally difficult and require a high level of critical thinking.

**Key Concepts:**
${context}

**NON-NEGOTIABLE RULES:**
1.  **Strictly Adhere to Content:** You are strictly forbidden from using any external knowledge. All questions, options, and answers MUST be directly derived from the Key Concepts provided.
2.  **Obey the Language:** The entire quiz MUST be in the same language as the Key Concepts.
3.  **Generate Exactly ${numQuestions} Questions:** You are required to generate exactly the number of questions requested.
4.  **Question Type Integrity:** If a question is inherently explanatory or requires a detailed answer (e.g., starts with "Explain...", "Describe...", "Why..."), you MUST classify it as 'openEnded'. Do not force an explanatory question into a multiple-choice structure.
5.  **No Placeholders or Garbage:** All fields (question, options, answer) MUST contain meaningful, relevant content. Do not use generic placeholders like "string", "option A", "Lorem Ipsum", or "correct answer".
6.  **Prioritize Synthesis:** Questions must force the user to synthesize information from multiple sections of the provided concepts.
7.  **Devious Distractors:** For multiple-choice questions, the incorrect options must be highly plausible and designed to trap common misconceptions based on the text. All four options must be distinct.
8.  **Avoid Duplicates:** Do not repeat concepts or questions. Avoid asking about questions from this list: ${existingQuestions && existingQuestions.length > 0 ? JSON.stringify(existingQuestions) : 'None'}.
9.  **Impeccable LaTeX Formatting:** For any mathematical equations or symbols, you MUST use proper LaTeX formatting.
    -   Enclose inline math with single dollar signs (\`$...$\`).
    -   Enclose block math with double dollar signs (\`$$...$$\`).
    -   **CRITICAL:** For ALL superscripts or subscripts, you MUST use curly braces, even for single characters. For example: write \`$z^{6}$\` NOT \`$z^6$\`. Write \`$x^{2}$\` NOT \`$x^2$\`. Write \`$10^{-19}$\` NOT \`$10^-19$\`.
    -   Use standard LaTeX commands for functions and symbols (e.g., \`\\sin\`, \`\\cos\`, \`\\theta\`, \`\\alpha\`, \`\\sqrt{}\`, \`\\frac{}{}\`). For example, write \`$x = a \\sin \\theta$\` instead of \`x = a sin θ\`.
    -   **DO NOT** use parentheses for math, such as \`\\(\` or \`\\)\`. Only use dollar signs.

**Output Mandate:**
You MUST provide your response in the specified JSON format. Failure is not an option.`;

    const maxRetries = 3;
    const initialDelay = 2000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const {output} = await runner.generate({
                model: 'googleai/gemini-1.5-flash-latest',
                prompt: quizPrompt,
                output: {
                    format: 'json',
                    schema: GenerateHellBoundQuizOutputSchema,
                }
            });

            if (!output) {
              throw new Error("The AI failed to generate the Hell Bound quiz. It returned an empty or invalid response.");
            }
            return output; // Success
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isOverloaded = errorMessage.includes('503') || errorMessage.includes('overloaded');

            if (isOverloaded && attempt < maxRetries) {
                console.warn(`Attempt ${attempt} for Hell Bound quiz generation failed due to model overload. Retrying in ${initialDelay * attempt}ms...`);
                await new Promise(resolve => setTimeout(resolve, initialDelay * attempt));
                continue; // Retry
            }
            
            console.error("Critical error in generateHellBoundQuizFlow:", error);
            let message = "An unknown error occurred during Hell Bound quiz generation.";
            if (isOverloaded) {
                 message = "The AI model is still overloaded after multiple retries. Please wait a moment and try again.";
            } else if (error instanceof Error) {
                message = error.message;
            } else if (typeof error === 'string') {
                message = error;
            }
            throw new Error(message);
        }
    }
    throw new Error("Hell Bound quiz generation failed after multiple retries.");
  }
);
