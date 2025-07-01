
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// --- Schemas are now self-contained within the API route for stability ---
const ExtractLatexFromImageInputSchema = z.object({
  imageDataUrl: z.string().describe("The image data URI."),
  localOcrAttempt: z.string().optional().describe("Optional local OCR text."),
  apiKey: z.string().optional().describe('Optional Gemini API key.'),
});
type ExtractLatexFromImageInput = z.infer<typeof ExtractLatexFromImageInputSchema>;

const ExtractLatexFromImageOutputSchema = z.object({
    latex_representation: z.string().describe("The full mathematical expression and steps converted into a single, valid LaTeX string."),
    steps_extracted: z.array(z.string()).describe("An array of strings, where each string is a distinct step or line from the original work."),
    confidence_score: z.number().min(0).max(100).describe("A confidence score from 0 to 100 on the accuracy of the transcription.")
});
type ExtractLatexFromImageOutput = z.infer<typeof ExtractLatexFromImageOutputSchema>;


// This function contains the full logic for LaTeX extraction,
// using a direct `fetch` call for maximum stability.
async function performLatexExtraction(input: ExtractLatexFromImageInput): Promise<NextResponse> {
  const { imageDataUrl, localOcrAttempt, apiKey } = input;

  if (!apiKey) {
    return NextResponse.json({ error: 'API Key is required for this feature.' }, { status: 400 });
  }
   if (!imageDataUrl || !imageDataUrl.startsWith('data:image')) {
    return NextResponse.json({ error: 'A valid image data URL is required.' }, { status: 400 });
  }

  const matches = imageDataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return NextResponse.json({ error: 'Invalid data URI format for image.' }, { status: 400 });
  }
  const mimeType = matches[1];
  const base64Data = matches[2];

  const promptText = `You are an expert AI specializing in converting handwritten and typed mathematical work from images into structured LaTeX. Your primary goal is to achieve a perfect, renderable LaTeX representation.

**Local OCR's Initial (and likely flawed) Text Extraction:**
${localOcrAttempt || 'No local OCR attempt was made.'}

**Your Task:**
1.  **Analyze the Image:** The image is the ground truth. Use your vision capabilities to meticulously interpret every symbol, number, and operator.
2.  **Understand the Structure:** Recognize the spatial layout of the math—fractions, exponents, subscripts, matrices, etc.
3.  **Correct and Format:** Convert the visual structure into a single, valid LaTeX string. Ensure all mathematical notation is correctly formatted.
4.  **Extract Steps:** Break down the work into logical steps or lines.
5.  **Assess Confidence:** Provide a confidence score (0-100) based on how certain you are of the transcription's accuracy.

**NON-NEGOTIABLE FORMATTING RULES:**
-   Enclose inline math with single dollar signs (\`$...$\`).
-   Enclose block math with double dollar signs (\`$$...$$\`).
-   **CRITICAL:** For ALL superscripts or subscripts, you MUST use curly braces, even for single characters. For example: write \`$z^{6}$\` NOT \`$z^6$\`. Write \`$x^{2}$\` NOT \`$x^2$\`. Write \`$10^{-19}$\` NOT \`$10^-19$\`.
-   Use standard LaTeX commands for functions and symbols (e.g., \`\\sin\`, \`\\cos\`, \`\\theta\`, \`\\alpha\`, \`\\sqrt{}\`, \`\\frac{}{}\`).
-   **DO NOT** use parentheses for math, such as \`\\(\` or \`\\)\`. Only use dollar signs.

**CRITICAL OUTPUT FORMAT:**
You MUST respond ONLY with a valid JSON object matching this exact schema. Do not add any text, markdown, or commentary before or after the JSON.
\`\`\`json
{
  "latex_representation": "string",
  "steps_extracted": ["string"],
  "confidence_score": "number"
}
\`\`\`
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

  try {
    const apiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ 
            parts: [
                { text: promptText },
                { inline_data: { mime_type: mimeType, data: base64Data } }
            ] 
        }],
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
             error: 'Failed to extract LaTeX from image',
             details: errorMessage
        }, { status: 500 });
    }

    let output: any;

    if (responseData?.candidates?.[0]?.content?.parts?.[0]?.json) {
      output = responseData.candidates[0].content.parts[0].json;
    } 
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
        return NextResponse.json({ error: 'Failed to extract LaTeX from image', details: 'AI returned malformed JSON.' }, { status: 500 });
      }
    }

    if (!output) {
      console.error("Invalid response structure from Gemini", responseData);
      return NextResponse.json({ error: 'Failed to extract LaTeX from image', details: "The AI returned an unexpected or empty response format." }, { status: 500 });
    }

    const parseResult = ExtractLatexFromImageOutputSchema.safeParse(output);
    if (!parseResult.success) {
      console.error("AI output did not match Zod schema:", parseResult.error, output);
      return NextResponse.json({ error: 'Failed to extract LaTeX from image', details: `The AI returned an object with an invalid structure. Details: ${parseResult.error.message}` }, { status: 500 });
    }

    return NextResponse.json(parseResult.data);

  } catch (error: any) {
    console.error('LaTeX extraction fetch failed:', error);
    const errorMessage = error.cause?.message || error.message || 'Could not connect to the Google API server.';
    return NextResponse.json({ error: 'Failed to extract LaTeX from image', details: errorMessage }, { status: 500 });
  }
}

// Main handler for the API route
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = ExtractLatexFromImageInputSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid input provided to API.', details: parseResult.error.flatten() }, { status: 400 });
    }

    return await performLatexExtraction(parseResult.data);

  } catch (error) {
    console.error('Critical unhandled error in POST /api/extract-latex-from-image:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred during request processing.';
    return NextResponse.json({ 
        error: 'Failed to extract LaTeX from image', 
        details: `A critical server error occurred: ${errorMessage}` 
    }, { status: 500 });
  }
}
