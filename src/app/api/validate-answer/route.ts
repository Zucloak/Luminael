import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// --- Schemas are now self-contained within the API route for stability ---
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


// This function contains the full logic for validating an answer,
// using a direct `fetch` call for maximum stability.
async function performAnswerValidation(input: ValidateAnswerInput): Promise<NextResponse> {
  const { question, userAnswer, correctAnswer, apiKey } = input;

  if (!apiKey) {
    return NextResponse.json({
      status: 'Incorrect',
      explanation: 'AI validation could not be performed because the API Key was missing.',
    });
  }

  const promptText = `You are a university-level teaching assistant AI, an expert in evaluating student answers with nuance and precision. Your task is to analyze a user's answer against a correct solution and provide a fair evaluation. Your judgment must be based on conceptual understanding, not just keyword matching.

**Evaluation Context:**
- **Question Asked:** ${question}
- **The Ideal Correct Answer:** ${correctAnswer}
- **The Student's Submitted Answer:** ${userAnswer}

**Your Mandate (Follow these steps precisely):**

1.  **Internal Reasoning (Your thought process):**
    *   First, identify the core concepts, principles, or key pieces of information present in the "Ideal Correct Answer".
    *   Second, analyze the "Student's Submitted Answer". Does it demonstrate an understanding of these core concepts?
    *   Third, compare them. Identify what the student got right, what they missed, and what they got wrong. Acknowledge that different wording can still convey the same correct meaning. Your goal is to assess understanding, not prose.

2.  **Final Evaluation (Provide your output based on your reasoning):**
    Based on your internal reasoning, you will classify the student's answer into one of a three categories.

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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

  try {
    const apiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          responseMimeType: 'application/json',
        }
      }),
    });

    const responseData = await apiResponse.json();

    if (!apiResponse.ok) {
        const errorMessage = responseData?.error?.message || 'The AI model failed to process the request.';
        console.error("Gemini API Error:", errorMessage, responseData);
        return NextResponse.json({
             status: 'Incorrect',
             explanation: `AI validation system error: ${errorMessage}`
        });
    }

    let output: any;

    // Happy path: model returned structured JSON correctly
    if (responseData?.candidates?.[0]?.content?.parts?.[0]?.json) {
      output = responseData.candidates[0].content.parts[0].json;
    } 
    // Fallback: model returned JSON as a string, possibly with markdown fences
    else if (responseData?.candidates?.[0]?.content?.parts?.[0]?.text) {
      let textResponse = responseData.candidates[0].content.parts[0].text;
      
      const jsonMatch = textResponse.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        textResponse = jsonMatch[1];
      }

      try {
        output = JSON.parse(textResponse);
      } catch (e) {
        console.error("Failed to parse text response from Gemini as JSON", textResponse);
        output = null;
      }
    }

    if (!output) {
      console.error("Invalid response structure from Gemini", responseData);
      return NextResponse.json({
        status: 'Incorrect',
        explanation: "AI validation system error: The AI returned an unexpected or empty response format."
      });
    }

    const parseResult = ValidateAnswerOutputSchema.safeParse(output);
    if (!parseResult.success) {
      console.error("AI output did not match Zod schema:", parseResult.error, output);
      return NextResponse.json({
        status: 'Incorrect',
        explanation: `AI validation system error: The AI returned an object with an invalid structure. Details: ${parseResult.error.message}`
      });
    }

    return NextResponse.json(parseResult.data);

  } catch (error: any) {
    console.error('Answer validation fetch failed:', error);
    const errorMessage = error.cause?.message || error.message || 'Could not connect to the Google API server.';
    return NextResponse.json({
      status: 'Incorrect',
      explanation: `AI validation system error: ${errorMessage}`
    });
  }
}

// Main handler for the API route
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = ValidateAnswerInputSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid input provided to API.', details: parseResult.error.flatten() }, { status: 400 });
    }

    return await performAnswerValidation(parseResult.data);

  } catch (error) {
    console.error('Critical unhandled error in POST /api/validate-answer:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred during request processing.';
    return NextResponse.json({ 
        error: 'Failed to validate answer', 
        details: `A critical server error occurred: ${errorMessage}` 
    }, { status: 500 });
  }
}
