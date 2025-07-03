
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
  questionFormat: z.enum(['multipleChoice', 'problemSolving', 'openEnded', 'mixed']).describe("The desired format for the quiz questions."),
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

const ProblemSolvingQuestionSchema = z.object({
  questionType: z.enum(['problemSolving']).describe("The type of the question: calculative, step-by-step, numeric or symbolic problem."),
  question: z.string().describe('The problem statement, derived ONLY from the provided material and in the same language. All mathematical notation MUST be properly formatted in LaTeX and enclosed in single ($...$) or double ($$...$$) dollar signs for rendering.'),
  answer: z.string().describe('The detailed, step-by-step solution, resulting in a numeric or symbolic answer (often boxed). Derived ONLY from the provided material and in the same language. All mathematical notation MUST be properly formatted in LaTeX and enclosed in single ($...$) or double ($$...$$) dollar signs.'),
});

const OpenEndedQuestionSchema = z.object({
  questionType: z.enum(['openEnded']).describe("The type of the question: theoretical, opinion-based, or conceptual."),
  question: z.string().describe('The open-ended question, derived ONLY from the provided material and in the same language. All mathematical notation MUST be properly formatted in LaTeX and enclosed in single ($...$) or double ($$...$$) dollar signs for rendering.'),
  answer: z.string().describe('The expected answer or key discussion points for the open-ended question. Derived ONLY from the provided material and in the same language. All mathematical notation MUST be properly formatted in LaTeX and enclosed in single ($...$) or double ($$...$$) dollar signs.'),
});

const QuestionSchema = z.union([MultipleChoiceQuestionSchema, ProblemSolvingQuestionSchema, OpenEndedQuestionSchema]);

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
    if (!apiKey || apiKey.trim() === '') {
      throw new Error("A valid API Key is required for generateQuizFlow but was not provided or was empty.");
    }
    const runner = genkit({
      plugins: [googleAI({apiKey})],
      model: 'googleai/gemini-1.5-flash-latest' // Explicitly set model for this runner
    });

    const quizPrompt = `You are an expert AI educator. Your task is to generate a quiz based on the **Key Concepts** provided below.

**Key Concepts:**
${context}

**NON-NEGOTIABLE RULES:**
1.  **Strictly Adhere to Content:** You are strictly forbidden from using any external knowledge. All questions, options, and answers MUST be directly derived from the Key Concepts provided.
2.  **Obey the Language:** The entire quiz MUST be in the same language as the Key Concepts.
3.  **Generate Exactly ${numQuestions} Questions:** You are required to generate exactly the number of questions requested.
4.  **Strict Question Format Adherence & Type Integrity:**
    *   **If '${questionFormat}' is 'multipleChoice'**:
        *   Generate **ONLY** multiple-choice questions. Each question MUST have the \`questionType\` field set to \`multipleChoice\`.
        *   Provide 4 distinct options. The \`answer\` field must exactly match one of the \`options\`.
    *   **If '${questionFormat}' is 'problemSolving'**:
        *   Generate **ONLY** procedural, computation-based problems. Each question MUST have the \`questionType\` field set to \`problemSolving\`.
        *   These questions require a step-by-step derivation leading to a specific numeric or symbolic answer. The final answer in the solution should ideally be boxed (e.g., using \`\\\\boxed{answer}\`).
        *   The \`answer\` field MUST contain a detailed, step-by-step solution.
        *   **CRITICAL FOR 'problemSolving'**: DO NOT generate \`multipleChoice\` or \`openEnded\` (conceptual/theoretical) questions when \`problemSolving\` is requested. Focus exclusively on calculative problems.
    *   **If '${questionFormat}' is 'openEnded'**:
        *   Generate **ONLY** theoretical, opinion-based, or conceptual questions. Each question MUST have the \`questionType\` field set to \`openEnded\`.
        *   These questions require free-form, textual answers. The \`answer\` field should provide a model answer or key discussion points.
        *   **CRITICAL FOR 'openEnded'**: DO NOT generate \`multipleChoice\` or \`problemSolving\` (calculative) questions when \`openEnded\` is requested.
    *   **If '${questionFormat}' is 'mixed'**:
        *   Generate a blend of \`multipleChoice\`, \`problemSolving\` (calculative), and \`openEnded\` (conceptual) questions. Ensure each question generated correctly sets its \`questionType\` field.
    *   **General Type Integrity**: Do not misclassify question types. For example, a question asking "Explain the concept of X" is \`openEnded\`. A question asking "Calculate Y given Z" is \`problemSolving\`.

5.  **No Placeholders or Garbage:** All fields (\`question\`, \`options\`, \`answer\`) MUST contain meaningful, relevant content. Do not use generic placeholders like "string", "option A", "Lorem Ipsum", or "correct answer". For multiple-choice questions, all four options must be distinct and plausible.
6.  **Difficulty:** Calibrate the questions to a '${difficulty}' level.
7.  **Avoid Duplicates:** Do not generate questions that are identical or too similar to these existing questions: ${existingQuestions && existingQuestions.length > 0 ? JSON.stringify(existingQuestions) : 'None'}.
8.  **Impeccable and Robust LaTeX Formatting:** For ALL mathematical content (equations, symbols, variables in text):
    *   Enclose inline math with single dollar signs (\`\\$...\\$\`). Example: \`The value is \\$x^{2}\\$ units.\`
    *   Enclose block/display math with double dollar signs (\`\\$\\$...\\$\\$\`). Example: \`\\$\\$ E = mc^{2} \\$\\$\`
    *   **CRITICAL FOR SUPERSCRIPTS/SUBSCRIPTS:** ALWAYS use curly braces for scripts, even for single characters. Examples: \`\\$x^{y}\\$\`, \`\\$a_{b}\\$\`, \`\\$10^{-19}\\$\`, \`\\$z^{6}\\$\`. Incorrect: \`\\$x^y\\$\`, \`\\$a_b\\$\`.
    *   **Standard Commands:** Use standard LaTeX commands (e.g., \`\\\\sin\`, \`\\\\cos\`, \`\\\\frac{}{}\`, \`\\\\sqrt{}\`, \`\\\\sum_{i=0}^{n}\`, \`\\\\int_{a}^{b}\`, \`\\\\vec{F}\`, \`\\\\alpha\`, \`\\\\beta\`, \`\\\\Delta\`). For example, write \`\\$x = a \\\\sin \\theta\\$\` instead of \`x = a sin θ\`.
    *   **Escaping Special LaTeX Characters:** If characters like \`#\`, \`_\`, \`^\`, \`{\`, \`}\` are needed as literal text *within* a math environment, they might need escaping (e.g., \`\\\\_\`, \`\\\\{\`). However, for math symbols, use LaTeX commands.
    *   **Clarity for Renderer:** Ensure there are no ambiguous constructions. For instance, make sure fractions are clearly denoted \`\\\\frac{numerator}{denominator}\`. Ensure matrices or multi-line equations use appropriate LaTeX environments (e.g., \`pmatrix\`, \`align\`, \`cases\`).
    *   **DO NOT** use Markdown for math. Only use LaTeX within dollar signs.
    *   **DO NOT** use non-standard or custom LaTeX commands unless you are certain they are supported by MathJax or KaTeX.
    *   **DO NOT** use parentheses for math delimiters like \`\\(\` or \`\\)\`. Only use dollar signs.
    *   **Test your LaTeX output mentally:** If it looks like it might be ambiguous or break a renderer, simplify or clarify. For example, ensure all environments are correctly opened and closed.

**Output Format:**
You MUST provide your response in the specified JSON format.`;
        
    const maxRetries = 3;
    const initialDelay = 2000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const {output} = await runner.generate({
            prompt: quizPrompt,
            output: {
                format: 'json',
                schema: GenerateQuizOutputSchema
            }
            });
            
            if (!output) {
                throw new Error("The AI failed to generate a quiz. It returned an empty or invalid response.");
            }
            return output; // Success
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isOverloaded = errorMessage.includes('503') || errorMessage.includes('overloaded');

            if (isOverloaded && attempt < maxRetries) {
                console.warn(`Attempt ${attempt} for quiz generation failed due to model overload. Retrying in ${initialDelay * attempt}ms...`);
                await new Promise(resolve => setTimeout(resolve, initialDelay * attempt));
                continue; // Retry
            }

            console.error("Critical error in generateQuizFlow:", error);
            let message = "An unknown error occurred during quiz generation.";
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
    throw new Error("Quiz generation failed after multiple retries.");
  }
);
