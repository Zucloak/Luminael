'use server';
/**
 * @fileOverview AI agent that validates a user's answer to an open-ended question.
 *
 * - validateAnswer - A function that handles the answer validation.
 * - ValidateAnswerInput - The input type for the validateAnswer function.
 * - ValidateAnswerOutput - The return type for the validateAnswer function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ValidateAnswerInputSchema = z.object({
  question: z.string().describe("The original quiz question."),
  userAnswer: z.string().describe("The answer provided by the user."),
  correctAnswer: z.string().describe("The reference correct answer for the question."),
  apiKey: z.string().optional().describe('Optional Gemini API key.'),
});
export type ValidateAnswerInput = z.infer<typeof ValidateAnswerInputSchema>;

export const ValidateAnswerOutputSchema = z.object({
  status: z.enum(['Correct', 'Partially Correct', 'Incorrect']).describe("The validation status of the user's answer."),
  explanation: z.string().describe("A brief explanation for the validation status, providing constructive feedback to the user. All mathematical notation MUST be properly formatted in LaTeX and enclosed in single ($...$) or double ($$...$$) dollar signs."),
});
export type ValidateAnswerOutput = z.infer<typeof ValidateAnswerOutputSchema>;

// This schema is for the prompt itself, excluding the API key.
const ValidateAnswerPromptInputSchema = z.object({
    question: z.string().describe("The original quiz question."),
    userAnswer: z.string().describe("The answer provided by the user."),
    correctAnswer: z.string().describe("The reference correct answer for the question."),
});

export async function validateAnswer(input: ValidateAnswerInput): Promise<ValidateAnswerOutput> {
  return validateAnswerFlow(input);
}

const validateAnswerFlow = ai.defineFlow(
  {
    name: 'validateAnswerFlow',
    inputSchema: ValidateAnswerInputSchema,
    outputSchema: ValidateAnswerOutputSchema,
  },
  async (input) => {
    const promptTemplate = `You are an expert validator for a quiz application. Your role is to assess a user's answer for an open-ended question based on a provided correct answer. You must provide nuanced feedback and determine if the user's response is Correct, Partially Correct, or Incorrect.

**Context:**
- **Question:** {{{question}}}
- **Correct Answer:** {{{correctAnswer}}}
- **User's Answer:** {{{userAnswer}}}

**Your Task:**
1.  **Analyze and Compare:** Meticulously compare the User's Answer to the Correct Answer. Do not perform a simple keyword match. Your goal is to evaluate the user's conceptual understanding. The user's wording does not need to be identical to be correct.
2.  **Evaluate with Nuance:**
    -   **Correct:** The user's answer fully captures the key concepts and correctness of the provided solution, even if worded differently.
    -   **Partially Correct:** The user's answer demonstrates a solid understanding of the main idea but misses key details, is incomplete, contains minor factual errors, or oversimplifies a complex topic. This is for answers that are on the right track but not fully correct. For example, if the correct answer is "A and B", and the user answers "A", this is Partially Correct.
    -   **Incorrect:** The user's answer is fundamentally wrong, irrelevant, or demonstrates a clear lack of understanding.
3.  **Explain Your Reasoning:** Write a brief, helpful explanation for your decision.
    -   For 'Correct' answers, offer brief praise and confirm their understanding.
    -   For 'Partially Correct' answers, acknowledge what they got right and gently point out what was missing or incorrect to guide their learning.
    -   For 'Incorrect' answers, provide a clear and simple explanation of the correct concept without being discouraging.

**Output Format:**
You MUST respond in the following JSON format. Do not add any text before or after the JSON object.

{{jsonSchema}}`;

    const { apiKey, ...promptInput } = input;
    const runner = apiKey
      ? genkit({
          plugins: [googleAI({apiKey})],
          model: 'googleai/gemini-2.0-flash',
        })
      : ai;

    const prompt = runner.definePrompt({
        name: 'validateAnswerPrompt',
        input: {schema: ValidateAnswerPromptInputSchema},
        output: {schema: ValidateAnswerOutputSchema},
        prompt: promptTemplate,
    });

    const {output} = await prompt(promptInput);
    
    if (!output) {
      throw new Error("AI validation failed. The model did not return a response, possibly due to content safety filters or an internal error.");
    }
    
    return output;
  }
);
