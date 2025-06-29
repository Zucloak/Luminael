'use server';
/**
 * @fileOverview An AI flow that extracts mathematical work from an image and converts it into structured LaTeX.
 *
 * - extractLatexFromImage - A function that handles the image-to-LaTeX conversion process.
 * - ExtractLatexFromImageInput - The input type for the extractLatexFromImage function.
 * - ExtractLatexFromImageOutput - The return type for the extractLatexFromImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const ExtractLatexFromImageInputSchema = z.object({
  imageDataUrl: z
    .string()
    .describe(
      "An image file of mathematical work, encoded as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  localOcrAttempt: z.string().optional().describe("The (potentially flawed) text extracted by a local OCR tool."),
  apiKey: z.string().optional().describe('Optional Gemini API key.'),
});
export type ExtractLatexFromImageInput = z.infer<typeof ExtractLatexFromImageInputSchema>;

export const ExtractLatexFromImageOutputSchema = z.object({
    latex_representation: z.string().describe("The full mathematical expression and steps converted into a single, valid LaTeX string."),
    steps_extracted: z.array(z.string()).describe("An array of strings, where each string is a distinct step or line from the original work."),
    confidence_score: z.number().min(0).max(100).describe("A confidence score from 0 to 100 on the accuracy of the transcription.")
});
export type ExtractLatexFromImageOutput = z.infer<typeof ExtractLatexFromImageOutputSchema>;

// This schema is for the prompt itself.
const ExtractLatexFromImagePromptInputSchema = ExtractLatexFromImageInputSchema.omit({apiKey: true});


export async function extractLatexFromImage(input: ExtractLatexFromImageInput): Promise<ExtractLatexFromImageOutput> {
  return extractLatexFromImageFlow(input);
}

const extractLatexFromImageFlow = ai.defineFlow(
  {
    name: 'extractLatexFromImageFlow',
    inputSchema: ExtractLatexFromImageInputSchema,
    outputSchema: ExtractLatexFromImageOutputSchema,
  },
  async ({ imageDataUrl, localOcrAttempt, apiKey }) => {
    const promptTemplate = `You are an expert AI specializing in converting handwritten and typed mathematical work from images into structured LaTeX. Your primary goal is to achieve a perfect, renderable LaTeX representation.

**Image of Mathematical Work:**
{{media url=imageDataUrl}}

**Local OCR's Initial (and likely flawed) Text Extraction:**
{{#if localOcrAttempt}}
{{localOcrAttempt}}
{{else}}
No local OCR attempt was made.
{{/if}}

**Your Task:**
1.  **Analyze the Image:** The image is the ground truth. Use your vision capabilities to meticulously interpret every symbol, number, and operator.
2.  **Understand the Structure:** Recognize the spatial layout of the math—fractions, exponents, subscripts, matrices, etc.
3.  **Correct and Format:** Convert the visual structure into a single, valid LaTeX string. Ensure all mathematical notation is correctly formatted. For example, \`x^2\` not \`x2\`, \`\\frac{a}{b}\` not \`a/b\`.
4.  **Extract Steps:** Break down the work into logical steps or lines.
5.  **Assess Confidence:** Provide a confidence score (0-100) based on how certain you are of the transcription's accuracy.

**Output Format:**
You MUST respond in the following JSON format. Do not add any text before or after the JSON object.

{{jsonSchema}}`;
    
    const runner = apiKey
      ? genkit({
          plugins: [googleAI({apiKey})],
          model: 'googleai/gemini-2.0-flash',
        })
      : ai;
    
    const prompt = runner.definePrompt({
        name: 'extractLatexFromImagePrompt',
        input: {schema: ExtractLatexFromImagePromptInputSchema},
        output: {schema: ExtractLatexFromImageOutputSchema},
        prompt: promptTemplate,
    });

    const {output} = await prompt({imageDataUrl, localOcrAttempt});

    if (!output) {
      throw new Error("AI processing failed. The model did not return a response, possibly due to content safety filters or an internal error.");
    }
    
    return output;
  }
);
