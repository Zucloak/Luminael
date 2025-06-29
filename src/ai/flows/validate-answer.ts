
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
  explanation: z.string().describe("A brief explanation for the validation status, providing constructive feedback to the user. All mathematical notation MUST be properly formatted in LaTeX, using $...$ for inline math and $$...$$ for block math. Multi-character superscripts or subscripts must use curly braces (e.g., `$10^{-19}$`)."),
});
export type ValidateAnswerOutput = z.infer<typeof ValidateAnswerOutputSchema>;

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
      if (!input.apiKey) {
        return {
          status: 'Incorrect',
          explanation: 'AI validation could not be performed because the API Key was missing.',
        };
      }

      const { apiKey } = input;
      const runner = genkit({
        plugins: [googleAI({apiKey})],
      });

      // Manually construct the prompt to avoid using the higher-level definePrompt abstraction,
      // which appears to be the source of instability.
      const promptText = `You are a university-level teaching assistant AI, an expert in evaluating student answers with nuance and precision. Your task is to analyze a user's answer against a correct solution and provide a fair evaluation. Your judgment must be based on conceptual understanding, not just keyword matching.

**Evaluation Context:**
- **Question Asked:** ${input.question}
- **The Ideal Correct Answer:** ${input.correctAnswer}
- **The Student's Submitted Answer:** ${input.userAnswer}

**Your Mandate (Follow these steps precisely):**

1.  **Internal Reasoning (Your thought process):**
    *   First, identify the core concepts, principles, or key pieces of information present in the "Ideal Correct Answer".
    *   Second, analyze the "Student's Submitted Answer". Does it demonstrate an understanding of these core concepts?
    *   Third, compare them. Identify what the student got right, what they missed, and what they got wrong. Acknowledge that different wording can still convey the same correct meaning. Your goal is to assess understanding, not prose.

2.  **Final Evaluation (Provide your output based on your reasoning):**
    Based on your internal reasoning, you will classify the student's answer into one of three categories.

    *   **Correct:** The student's answer fully and accurately captures the essential concepts of the ideal solution. Minor differences in wording are acceptable.
    *   **Partially Correct:** The student is on the right track but their answer is incomplete, contains a minor but significant error, or misses some key details.
    *   **Incorrect:** The student's answer is fundamentally wrong, demonstrates a major misunderstanding of the core concept, or is completely irrelevant.

3.  **Constructive Feedback:**
    *   Write a concise, helpful explanation for your evaluation.
    *   If **Correct**, briefly affirm their understanding.
    *   If **Partially Correct**, praise what they got right and then gently clarify what was missing or needed correction.
    *   If **Incorrect**, provide a clear and encouraging explanation of the correct concept.
    *   **CRITICAL LaTeX Formatting:** Any math in your explanation MUST use proper LaTeX. Enclose inline math with single dollar signs (\`$...$\`) and block-level math with double dollar signs (\`$$...$$\`). For multi-character exponents/subscripts, use curly braces (e.g., \`$10^{-19}$\`, NOT \`$10^-19$\`). **Never use parentheses like \`\\(\`... \`\\)\` for math.**

**Critical Output Format:**
You MUST respond ONLY with a valid JSON object matching this exact schema. Do not add any text, markdown, or commentary before or after the JSON.
\`\`\`json
{
  "status": "'Correct' | 'Partially Correct' | 'Incorrect'",
  "explanation": "string"
}
\`\`\`
`;

      // Use the lower-level 'generate' call for maximum stability.
      const { text } = await runner.generate({
        model: 'googleai/gemini-1.5-flash-latest',
        prompt: promptText,
        config: {
          // Force JSON output from the model
          responseMIMEType: 'application/json',
        }
      });
      
      let output: ValidateAnswerOutput;
      try {
        // The model might still return a string with markdown ```json ... ``` wrapper.
        // We need to robustly parse it.
        const cleanedText = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        output = JSON.parse(cleanedText);
      } catch (jsonParseError) {
        console.error("Failed to parse JSON response from AI:", text, jsonParseError);
        return {
          status: 'Incorrect',
          explanation: "AI validation system error: The AI returned a response that was not valid JSON. Please try again."
        }
      }

      // Final validation against the Zod schema to ensure type safety.
      const parseResult = ValidateAnswerOutputSchema.safeParse(output);
      if (!parseResult.success) {
        console.error("AI output did not match Zod schema:", parseResult.error);
        return {
          status: 'Incorrect',
          explanation: `AI validation system error: The AI returned an object with an invalid structure. Details: ${parseResult.error.message}`
        }
      }

      return parseResult.data;

    } catch (error) {
        console.error("Critical error in validateAnswerFlow:", error);
        
        let message = "An unknown error occurred.";
        if (error instanceof Error) {
            message = error.message;
        } else if (typeof error === 'string') {
            message = error;
        } else {
            try {
                message = JSON.stringify(error);
            } catch (e) {
                message = "An un-serializable error object was thrown."
            }
        }
        
        return {
            status: 'Incorrect',
            explanation: `AI validation system error: ${message}`
        };
    }
  }
);
