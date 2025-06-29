
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
    try {
      const promptTemplate = `You are a university-level teaching assistant AI, an expert in evaluating student answers with nuance and precision. Your task is to analyze a user's answer against a correct solution and provide a fair evaluation. Your judgment must be based on conceptual understanding, not just keyword matching.

**Evaluation Context:**
- **Question Asked:** {{{question}}}
- **The Ideal Correct Answer:** {{{correctAnswer}}}
- **The Student's Submitted Answer:** {{{userAnswer}}}

**Your Mandate (Follow these steps precisely):**

1.  **Internal Reasoning (Your thought process):**
    *   First, identify the core concepts, principles, or key pieces of information present in the "Ideal Correct Answer".
    *   Second, analyze the "Student's Submitted Answer". Does it demonstrate an understanding of these core concepts?
    *   Third, compare them. Identify what the student got right, what they missed, and what they got wrong. Acknowledge that different wording can still convey the same correct meaning. Your goal is to assess understanding, not prose.

2.  **Final Evaluation (Provide your output based on your reasoning):**
    Based on your internal reasoning, you will classify the student's answer into one of three categories.

    *   **Correct:** The student's answer fully and accurately captures the essential concepts of the ideal solution. Minor differences in wording are acceptable.
    *   **Partially Correct:** The student is on the right track but their answer is incomplete, contains a minor but significant error, or misses some key details.
        *   *Example 1:* If the ideal answer is "It's because of A and B," and the student says "It's because of A," that is **Partially Correct**.
        *   *Example 2:* If the student correctly describes a concept but uses a flawed example to illustrate it, that is **Partially Correct**.
    *   **Incorrect:** The student's answer is fundamentally wrong, demonstrates a major misunderstanding of the core concept, or is completely irrelevant.

3.  **Constructive Feedback:**
    *   Write a concise, helpful explanation for your evaluation.
    *   If **Correct**, briefly affirm their understanding.
    *   If **Partially Correct**, praise what they got right and then gently clarify what was missing or needed correction.
    *   If **Incorrect**, provide a clear and encouraging explanation of the correct concept.

**Critical Output Format:**
You MUST respond ONLY with the specified JSON object. Do not include your internal reasoning in the final output. Do not add any text before or after the JSON.

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
        return {
            status: 'Incorrect',
            explanation: "AI validation failed. The model's response was not in the expected format, possibly due to content safety filters. Please try again."
        };
      }
      
      return output;
    } catch (error) {
        console.error("Critical error in validateAnswerFlow:", error);
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        // Return a valid error object that matches the flow's output schema to prevent crashes.
        return {
            status: 'Incorrect',
            explanation: `AI validation system error: ${message}`
        };
    }
  }
);
