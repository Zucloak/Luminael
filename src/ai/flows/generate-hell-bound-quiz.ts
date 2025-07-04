
'use server';
/**
 * @fileOverview AI agent that generates a super difficult quiz related to the uploaded files.
 *
 * - generateHellBoundQuiz - A function that handles the quiz generation process.
 * - GenerateHellBoundQuizInput - The input type for the generateHellBoundQuiz function.
 * - GenerateHellBoundQuizOutput - The return type for the generateHellBoundQuiz function.
 */

import {ai} from '@/ai/genkit';
// import {z} from 'zod'; // Zod definitions are now in types.ts
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {
  GenerateHellBoundQuizInputSchema,
  GenerateHellBoundQuizInput,
  GenerateHellBoundQuizOutputSchema, // This is an alias of GenerateQuizOutputSchema in types.ts
  GenerateHellBoundQuizOutput,
  // QuestionSchema, // Individual question schemas are part of GenerateHellBoundQuizOutputSchema
  // MultipleChoiceQuestionSchema,
  // ProblemSolvingQuestionSchema,
  // OpenEndedQuestionSchema,
} from '@/lib/types';

export async function generateHellBoundQuiz(input: GenerateHellBoundQuizInput): Promise<GenerateHellBoundQuizOutput> {
  return generateHellBoundQuizFlow(input);
}

const generateHellBoundQuizFlow = ai.defineFlow(
  {
    name: 'generateHellBoundQuizFlow',
    inputSchema: GenerateHellBoundQuizInputSchema, // Use imported schema
    outputSchema: GenerateHellBoundQuizOutputSchema, // Use imported schema
  },
  async ({ context, numQuestions, existingQuestions, apiKey }: GenerateHellBoundQuizInput): Promise<GenerateHellBoundQuizOutput> => {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error("A valid API Key is required for generateHellBoundQuizFlow but was not provided or was empty.");
    }
    const runner = genkit({ plugins: [googleAI({apiKey})] });

    const quizPrompt = `You are an expert AI educator specializing in creating deeply challenging assessments. Your task is to use the provided **Key Concepts** to generate a quiz that tests for true mastery, not just surface-level recall. The questions must be exceptionally difficult and require a high level of critical thinking.

**Key Concepts:**
${context}

ULTRA-CRITICAL RULE #0: MANDATORY LATEX DELIMITERS FOR ALL MATHEMATICAL NOTATION!
For EVERY piece of mathematical notation, variable, or expression (such as x, a_squared, an_expression_like_a_squared_minus_x_squared, or E_equals_mc_squared), it MUST be enclosed in appropriate LaTeX dollar sign delimiters.
-   For inline mathematics, use SINGLE dollar signs like \\$your_math_here\\$. Example: For 'x squared', output \\$x^{2}\\$.
-   For display mathematics, use DOUBLE dollar signs like \\$\\$your_math_here\\$\\$. Example: For 'E equals m c squared', output \\$\\$E=mc^{2}\\$\\$.
THERE ARE NO EXCEPTIONS. Math without these delimiters is INCORRECT. THIS IS A PRIMARY DIRECTIVE.

**NON-NEGOTIABLE RULES (for Hell Bound Quiz):**
1.  **Strictly Adhere to Content:** You are strictly forbidden from using any external knowledge. All questions, options, and answers MUST be directly derived from the Key Concepts provided.
2.  **Obey the Language:** The entire quiz MUST be in the same language as the Key Concepts.
3.  **Generate Exactly ${numQuestions} Questions:** You are required to generate exactly the number of questions requested.
4.  **Question Type Generation:** Generate a mix of 'multipleChoice', 'problemSolving', and 'openEnded' questions. The mix should be challenging and varied. Each question MUST have its \`questionType\` field correctly set.
5.  **Question Type Integrity (CRITICAL):**
    *   **\`problemSolving\`**: These questions MUST be procedural, computation-based problems requiring a step-by-step solution that results in a numeric or symbolic answer (ideally boxed using \`\\\\boxed{answer}\`). The answer field MUST contain the detailed, step-by-step solution. These should be complex and multi-step if possible, derived from the content.
    *   **\`openEnded\`**: These questions MUST be theoretical, conceptual, or require deep explanation or critical analysis. They should not be simple recall. The answer field MUST provide a comprehensive model answer or key discussion points.
    *   **\`multipleChoice\`**: These questions must have one correct answer and three highly plausible, devious distractors that test for common misconceptions or subtle details from the text. The \`answer\` field must exactly match one of the \`options\`.
    *   **DO NOT MISCLASSIFY QUESTION TYPES.** For example, a question asking to "Explain the theory of relativity" is \`openEnded\`. A question asking to "Calculate the energy released in a nuclear reaction given specific inputs" is \`problemSolving\`.
6.  **No Placeholders or Garbage:** All fields (\`question\`, \`options\` (if applicable), \`answer\`, \`questionType\`) MUST contain meaningful, relevant content. Do not use generic placeholders like "string", "option A", "Lorem Ipsum", or "correct answer".
7.  **Prioritize Synthesis & Difficulty:** Questions must force the user to synthesize information from multiple sections of the provided concepts and be exceptionally difficult.
8.  **Devious Distractors (for Multiple Choice):** Incorrect options must be highly plausible and designed to trap common misconceptions based on the text. All four options must be distinct.
9.  **Global De-duplication:** The provided list of \`existingQuestions\` (if any): ${existingQuestions && existingQuestions.length > 0 ? JSON.stringify(existingQuestions) : 'None'}. DO NOT generate any question that is identical or substantially similar to any question in this list.
10. **LaTeX Formatting:** ALL mathematical content (variables like x, formulas like a^2+b^2=c^2, expressions with units like 25 m/s) MUST be enclosed in single dollar signs for inline math (example: \\$x\\$, \\$a^2+b^2=c^2\\$, \\$25 \\\\text{ m/s}\\$) or double dollar signs for display math. Use common LaTeX commands like \\\\frac, \\\\sqrt, \\\\sin, \\\\cos. Ensure scripts use braces: \\$x^{2}\\$. This rule applies to all question text, all multiple-choice options, and all parts of answers.

**Output Mandate:**
You MUST provide your response in the specified JSON format. Failure is not an option.`;

    const maxRetries = 3;
    const initialDelay = 2000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const {output} = await runner.generate({
                model: 'googleai/gemini-1.5-flash-latest', // Re-add model specification
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
