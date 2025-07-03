// src/ai/flows/analyzeForLaTeX.ts
'use server';

import { ai } from '@/ai/genkit';
// Zod is no longer directly used here for schema definition, it's imported from types.ts
// import { z } from 'zod';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import {
  AnalyzeForLaTeXInputSchema,
  AnalyzeForLaTeXInput,
  AnalyzeForLaTeXOutputSchema,
  AnalyzeForLaTeXOutput
} from '@/lib/types'; // Import schemas and types

// Define the AI flow
export const analyzeForLaTeXFlow = ai.defineFlow(
  {
    name: 'analyzeForLaTeXFlow',
    inputSchema: AnalyzeForLaTeXInputSchema, // Use imported schema
    outputSchema: AnalyzeForLaTeXOutputSchema, // Use imported schema
  },
  async ({ content, apiKey }: AnalyzeForLaTeXInput): Promise<AnalyzeForLaTeXOutput> => { // Add types to params
    if (!apiKey || apiKey.trim() === '') {
      // Fallback for safety: if no API key, assume no LaTeX to prevent blocking calculative mode unnecessarily.
      // Or, could throw an error if API key is strictly required for this check too.
      // For now, let's be conservative and allow calculative if this check can't run.
      // A more robust solution might involve a non-AI local regex check as a primary or fallback.
      console.warn('[analyzeForLaTeXFlow] No API key provided. Defaulting to hasLaTeXContent: true to avoid blocking mode.');
      return { hasLaTeXContent: true }; // Or false, depending on desired default behavior
    }

    const runner = genkit({
      plugins: [googleAI({ apiKey })],
      model: 'googleai/gemini-1.5-flash-latest', // Using a fast model for this simple task
    });

    const prompt = `You are a text analysis assistant. Your task is to determine if the provided text content contains any mathematical formulas, equations, expressions, or symbols that would typically be rendered using LaTeX. This includes things like "$x^2 + y^2 = z^2$", "$$\\sum f(x)dx$$", inline math like "$E=mc^2$", or even just common mathematical symbols or structures that suggest calculations or formal mathematical representation.

Content to analyze:
---
${content}
---

Based on your analysis, respond with ONLY the boolean value 'true' if such mathematical or LaTeX-like content is present, and 'false' otherwise. Do not provide any explanation, preamble, or any other text besides the boolean value. For example, if you find such content, your entire response should be just: true`;

    try {
      const { output } = await runner.generate({
        prompt: prompt,
        output: {
          format: 'json', // Expecting a JSON boolean, but AI might return raw boolean string.
                           // Let's try to get it as a string and parse, or adjust prompt for direct JSON.
                           // Forcing JSON output for a single boolean is a bit heavy.
                           // Let's try a text output and parse it.
        },
        config: {
          temperature: 0.1, // Low temperature for factual determination
        }
      });

      if (output === null || typeof output !== 'string') {
        console.warn('[analyzeForLaTeXFlow] AI returned null or non-string output. Defaulting to true.');
        return { hasLaTeXContent: true }; // Default to true if AI response is unexpected
      }

      const outputText = output.trim().toLowerCase();
      if (outputText === 'true') {
        return { hasLaTeXContent: true };
      } else if (outputText === 'false') {
        return { hasLaTeXContent: false };
      } else {
        console.warn(`[analyzeForLaTeXFlow] AI returned unexpected text: "${outputText}". Defaulting to true.`);
        return { hasLaTeXContent: true }; // Default to true if AI response is not 'true' or 'false'
      }
    } catch (error) {
      console.error('[analyzeForLaTeXFlow] Error during AI analysis:', error);
      // In case of error, default to allowing calculative mode to avoid blocking user.
      return { hasLaTeXContent: true };
    }
  }
);

// Function to be called from server components or route handlers
export async function analyzeContentForLaTeX(input: AnalyzeForLaTeXInput): Promise<AnalyzeForLaTeXOutput> {
  return analyzeForLaTeXFlow(input);
}
