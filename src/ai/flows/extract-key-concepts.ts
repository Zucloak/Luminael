'use server';
/**
 * @fileOverview An AI flow that extracts key concepts from a collection of documents
 * and structures them into a single Markdown string.
 *
 * - extractKeyConcepts - A function that handles the concept extraction process.
 * - ExtractKeyConceptsInput - The input type for the extractKeyConcepts function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const FileContentSchema = z.object({
  name: z.string().describe("The name of the file."),
  content: z.string().describe("The text content of the file."),
});

const ExtractKeyConceptsInputSchema = z.object({
  files: z.array(FileContentSchema)
    .describe('An array of files, each with a name and its text content.'),
  apiKey: z.string().optional().describe('Optional Gemini API key.'),
});
export type ExtractKeyConceptsInput = z.infer<typeof ExtractKeyConceptsInputSchema>;

export async function extractKeyConcepts(input: ExtractKeyConceptsInput): Promise<string> {
  return extractKeyConceptsFlow(input);
}

const extractKeyConceptsFlow = ai.defineFlow(
  {
    name: 'extractKeyConceptsFlow',
    inputSchema: ExtractKeyConceptsInputSchema,
    outputSchema: z.string(),
  },
  async ({ files, apiKey }) => {
    if (!apiKey) {
      throw new Error("API Key is required for extractKeyConceptsFlow but was not provided.");
    }
    const runner = genkit({ plugins: [googleAI({apiKey})] });
      
    const processedContent = files.map(file => 
      `# File: ${file.name}\n\n${file.content}`
    ).join('\n\n---\n\n');

    const conceptInstruction = files.length > 3
        ? 'For each document provided in the context, identify and extract a maximum of 5 key concepts. The concepts should be the most important, high-level ideas from the text.'
        : 'For each document provided in the context, identify and extract all relevant key concepts. Be comprehensive.';

    const prompt = `You are an expert AI specializing in information synthesis. Your task is to analyze the provided Core Material, which consists of one or more documents, and extract the key concepts from each.

**Core Material:**
${processedContent}

**NON-NEGOTIABLE RULES:**
1.  **Adhere to Instructions:** ${conceptInstruction}
2.  **Strictly Adhere to Content:** You are strictly forbidden from using any external knowledge. All key concepts must be directly derived from the Core Material provided.
3.  **Obey the Language:** The output must be in the same language as the Core Material.
4.  **CRITICAL OUTPUT FORMAT:** You MUST format your response as a single Markdown string. Use a Markdown header (\`#\`) for each file name and a separator (\`---\`) between each document's concepts. For example:

# File: document_one.txt
- Key Concept A
- Key Concept B

---

# File: document_two.pdf
- Key Concept C
- Key Concept D
`;
    
    const maxRetries = 3;
    const initialDelay = 2000; // 2 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const {text} = await runner.generate({
                model: 'googleai/gemini-1.5-flash-latest',
                prompt: prompt,
            });
            
            if (!text) {
                throw new Error("The AI failed to synthesize key concepts. It returned an empty response.");
            }
            return text; // Success
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isOverloaded = errorMessage.includes('503') || errorMessage.includes('overloaded');

            if (isOverloaded && attempt < maxRetries) {
                console.warn(`Attempt ${attempt} for concept extraction failed due to model overload. Retrying in ${initialDelay * attempt}ms...`);
                await new Promise(resolve => setTimeout(resolve, initialDelay * attempt));
                continue; // Retry
            }
            
            console.error("Critical error in extractKeyConceptsFlow:", error);
            
            let message = "An unknown error occurred during concept extraction.";
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
    throw new Error("Concept extraction failed after multiple retries.");
  }
);
