
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

**ULTRA-CRITICAL RULE #0: MANDATORY LaTeX Delimiters for ALL Mathematical Notation!**
For EVERY piece of mathematical notation, variable, or expression (e.g., \`x\`, \`a^2\`, \`(a^2 - x^2)\`, \`E=mc^2\`), it MUST be enclosed in appropriate LaTeX dollar sign delimiters.
-   For inline mathematics (math within a line of text), use SINGLE dollar signs: \`\\$...\\$\`.
    Examples: \`The variable \\$x\\$ is unknown.\`, \`Its value is \\$a^{2}\\$.\`, \`Consider the expression \\$(a^{2} - x^{2}) = 0\\$\`.
-   For display mathematics (math on its own line), use DOUBLE dollar signs: \`\\$\\$...\\$\\$\`.
    Example: \`\\$\\$ E = mc^{2} \\$\\$\`
**There are NO exceptions to this rule.** Plain text that resembles math (e.g., `a^2 - x^2` without delimiters) is INCORRECT, will not render properly, and is considered a failure to meet fundamental formatting requirements. This is a primary directive.

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
10. **Impeccable and Robust LaTeX Formatting (RECALL CRITICAL RULE #0 ON DELIMITERS):**
    *   **MANDATORY DELIMITERS (Rule #0 REITERATED):** ALL math expressions, variables, and symbols (e.g., \`x\`, \`a^2\`, \`(a^2-x^2)\`) MUST be enclosed in \`\\$...\\$\` (inline) or \`\\$\\$...\\$\\$\` (display).
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
