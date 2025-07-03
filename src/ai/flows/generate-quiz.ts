
// src/ai/flows/generate-quiz.ts
'use server';
/**
 * @fileOverview Generates a quiz based on user-uploaded content.
 *
 * - generateQuiz - A function that generates a quiz from content.
 * - GenerateQuizInput - The input type for the generateQuiz function.
 * - GenerateQuizOutput - The return type for the generateQuiz function.
 */

import {ai} from '@/ai/genkit';
// Zod is no longer directly used here for schema definition
// import {z} from 'zod';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {
  GenerateQuizInputSchema,
  GenerateQuizInput,
  GenerateQuizOutputSchema,
  GenerateQuizOutput,
  // Individual question schemas are used by GenerateQuizOutputSchema which is imported
  // MultipleChoiceQuestionSchema,
  // ProblemSolvingQuestionSchema,
  // OpenEndedQuestionSchema,
  // QuestionSchema
} from '@/lib/types'; // Import schemas and types

export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  return generateQuizFlow(input);
}

// The Genkit flow definition itself uses the imported schemas.
// It's an object, but it's not typically imported by client components in a way that breaks "use server".
// The `generateQuiz` async function is the primary server action export.
const generateQuizFlow = ai.defineFlow(
  {
    name: 'generateQuizFlow',
    inputSchema: GenerateQuizInputSchema, // Use imported schema
    outputSchema: GenerateQuizOutputSchema, // Use imported schema
  },
  async ({ context, numQuestions, difficulty, questionFormat, existingQuestions, apiKey }: GenerateQuizInput): Promise<GenerateQuizOutput> => {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error("A valid API Key is required for generateQuizFlow but was not provided or was empty.");
    }
    const runner = genkit({
      plugins: [googleAI({apiKey})],
      model: 'googleai/gemini-1.5-flash-latest' // Explicitly set model for this runner
    });

    let activePrompt;

    if (questionFormat === 'problemSolving') {
      activePrompt = `You are an AI assistant laser-focused on generating calculative problems. Your SOLE task is to generate exactly ${numQuestions} procedural, computation-based problems based on the **Key Concepts** provided below.

**Key Concepts:**
${context}

**ULTRA-CRITICAL RULE #0: MANDATORY LaTeX Delimiters for ALL Mathematical Notation!**
For EVERY piece of mathematical notation, variable, or expression (e.g., \`x\`, \`a^2\`, \`(a^2 - x^2)\`, \`E=mc^2\`), it MUST be enclosed in appropriate LaTeX dollar sign delimiters.
-   For inline mathematics (math within a line of text), use SINGLE dollar signs: \`\\$...\\$\`.
    Examples: \`The variable \\$x\\$ is unknown.\`, \`Its value is \\$a^{2}\\$.\`, \`Consider the expression \\$(a^{2} - x^{2}) = 0\\$\`.
-   For display mathematics (math on its own line), use DOUBLE dollar signs: \`\\$\\$...\\$\\$\`.
    Example: \`\\$\\$ E = mc^{2} \\$\\$\`
**There are NO exceptions to this rule.** Plain text that resembles math (e.g., `a^2 - x^2` without delimiters) is INCORRECT, will not render properly, and is considered a failure to meet fundamental formatting requirements. This is a primary directive.

**ABSOLUTE NON-NEGOTIABLE RULES FOR THIS TASK (Problem Solving Questions ONLY):**
1.  **ONLY 'problemSolving' Questions**: Every single question you generate MUST be a procedural, computation-based problem that requires a step-by-step derivation to reach a numeric or symbolic answer. Each question's \`questionType\` field MUST be set to exactly \`problemSolving\`.
2.  **STRICT Schema Adherence**: Each generated question object MUST strictly conform to the ProblemSolvingQuestionSchema: \`{ questionType: 'problemSolving', question: string, answer: string (detailed step-by-step solution, ideally with a \\\\boxed{final_answer}) }\`.
3.  **NO OTHER QUESTION TYPES**: Under NO circumstances are you to generate any \`multipleChoice\` questions or any \`openEnded\` (conceptual, theoretical, discussion-based) questions. Your output MUST NOT contain \`options\` fields (which belong to \`multipleChoice\`) or questions that ask for explanations or opinions. If the Key Concepts do not lend themselves to ${numQuestions} distinct calculative problems, generate as many as possible up to ${numQuestions}, but DO NOT substitute with other types.
4.  **Content Adherence**: All questions and solutions MUST be directly derived from the provided Key Concepts. No external knowledge.
5.  **Language**: The entire quiz MUST be in the same language as the Key Concepts.
6.  **Number of Questions**: Generate up to ${numQuestions} questions as specified. If fewer calculative problems can be derived, that is acceptable.
7.  **Global De-duplication:** The provided list of \`existingQuestions\` (if any): ${existingQuestions && existingQuestions.length > 0 ? JSON.stringify(existingQuestions) : 'None'}. DO NOT generate any question that is identical or substantially similar to any question in this list.
8.  **Difficulty**: Calibrate questions to a '${difficulty}' level.
9.  **Impeccable and Robust LaTeX Formatting (RECALL CRITICAL RULE #0 ON DELIMITERS):**
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

**Output Format Mandate:**
You MUST provide your response as a JSON object that strictly conforms to the GenerateQuizOutputSchema, containing a 'quiz' object, which in turn contains a 'questions' array. EACH question object in this array MUST be a ProblemSolvingQuestionSchema object.
`;
    } else {
      // Existing comprehensive prompt for multipleChoice, openEnded, mixed
      activePrompt = `You are an expert AI educator. Your task is to generate a quiz based on the **Key Concepts** provided below.

**Key Concepts:**
${context}

**ULTRA-CRITICAL RULE #0: MANDATORY LaTeX Delimiters for ALL Mathematical Notation!**
For EVERY piece of mathematical notation, variable, or expression (e.g., \`x\`, \`a^2\`, \`(a^2 - x^2)\`, \`E=mc^2\`), it MUST be enclosed in appropriate LaTeX dollar sign delimiters.
-   For inline mathematics (math within a line of text), use SINGLE dollar signs: \`\\$...\\$\`.
    Examples: \`The variable \\$x\\$ is unknown.\`, \`Its value is \\$a^{2}\\$.\`, \`Consider the expression \\$(a^{2} - x^{2}) = 0\\$\`.
-   For display mathematics (math on its own line), use DOUBLE dollar signs: \`\\$\\$...\\$\\$\`.
    Example: \`\\$\\$ E = mc^{2} \\$\\$\`
**There are NO exceptions to this rule.** Plain text that resembles math (e.g., `a^2 - x^2` without delimiters) is INCORRECT, will not render properly, and is considered a failure to meet fundamental formatting requirements. This is a primary directive.

**NON-NEGOTIABLE RULES (for 'multipleChoice', 'openEnded', 'mixed' formats):**
1.  **Strictly Adhere to Content:** You are strictly forbidden from using any external knowledge. All questions, options, and answers MUST be directly derived from the Key Concepts provided.
2.  **Obey the Language:** The entire quiz MUST be in the same language as the Key Concepts.
3.  **Generate Exactly ${numQuestions} Questions:** You are required to generate exactly the number of questions requested.
4.  **Strict Question Format Adherence & Type Integrity:**
    *   **If '${questionFormat}' is 'multipleChoice'**:
        *   Generate **ONLY** multiple-choice questions. Each question MUST have its \`questionType\` field set to exactly \`multipleChoice\`.
        *   Provide 4 distinct options. The \`answer\` field must exactly match one of the \`options\`.
        *   Output JSON for these questions MUST conform to the MultipleChoiceQuestionSchema.
    *   **If '${questionFormat}' is 'openEnded'**:
        *   Generate **ONLY** theoretical, opinion-based, or conceptual questions. Each question MUST have its \`questionType\` field set to exactly \`openEnded\`.
        *   These questions require free-form, textual answers. The \`answer\` field should provide a model answer or key discussion points.
        *   **CRITICAL FOR 'openEnded'**: DO NOT generate \`multipleChoice\` or \`problemSolving\` (calculative) questions when \`openEnded\` is requested. Output JSON for these questions MUST conform to the OpenEndedQuestionSchema.
    *   **If '${questionFormat}' is 'mixed'**:
        *   Generate a balanced blend of \`multipleChoice\`, \`problemSolving\` (calculative, as defined below), and \`openEnded\` (conceptual, as defined above) questions.
        *   Ensure each question generated correctly sets its \`questionType\` field and conforms to its respective schema (MultipleChoiceQuestionSchema, ProblemSolvingQuestionSchema, or OpenEndedQuestionSchema).
        *   For 'problemSolving' questions within mixed mode: They MUST be procedural, computation-based problems requiring a step-by-step derivation leading to a specific numeric or symbolic answer. The \`answer\` field MUST contain a detailed, step-by-step solution. The final answer in the solution should ideally be boxed (e.g., using \`\\\\boxed{answer}\`).
    *   **Universal Type Integrity**: Do not misclassify question types. For example, a question asking for an explanation of a concept is \`openEnded\`. A question requiring a calculation is \`problemSolving\`. Adhere strictly to the definitions.

5.  **Schema Adherence & No Garbage:** All fields (\`question\`, \`options\` (if applicable), \`answer\`, \`questionType\`) MUST contain meaningful, relevant content derived ONLY from the provided Key Concepts. Do not use generic placeholders. For multiple-choice questions, all four options must be distinct and plausible. Ensure every generated question object perfectly matches its corresponding schema (MultipleChoiceQuestionSchema, ProblemSolvingQuestionSchema, or OpenEndedQuestionSchema) based on its \`questionType\`.
6.  **Difficulty:** Calibrate the questions to a '${difficulty}' level.
7.  **Global De-duplication:** The provided list of \`existingQuestions\` (if any) may contain questions of various types previously generated in this session. DO NOT generate any question (regardless of its type for the current batch) that is identical or substantially similar to any question found in this \`existingQuestions\` list. The goal is to ensure maximum variety and avoid all repetition across the entire quiz session.
8.  **Impeccable and Robust LaTeX Formatting (RECALL CRITICAL RULE #0 ON DELIMITERS):**
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

**Output Format Mandate:**
You MUST provide your response as a JSON object that strictly conforms to the GenerateQuizOutputSchema.
`;
    }
        
    const maxRetries = 3;
    const initialDelay = 2000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const {output} = await runner.generate({
            prompt: activePrompt, // Corrected variable name here
            output: {
                format: 'json',
                schema: GenerateQuizOutputSchema
            }
            });
            
            if (!output) {
                throw new Error("The AI failed to generate a quiz. It returned an empty or invalid response.");
            }

            // Post-generation filtering for 'problemSolving' mode as a safeguard
            if (questionFormat === 'problemSolving' && output.quiz && output.quiz.questions) {
                const originalCount = output.quiz.questions.length;
                output.quiz.questions = output.quiz.questions.filter(
                    q => q.questionType === 'problemSolving'
                );
                const filteredCount = output.quiz.questions.length;
                if (filteredCount < originalCount) {
                    console.warn(`[generateQuizFlow] Filtered out ${originalCount - filteredCount} non-problemSolving questions for 'problemSolving' mode.`);
                    // Optionally, decide here if you need to make another AI call to get more questions
                    // For now, we'll return the filtered list, which might be less than numQuestions.
                }
            }

            return output; // Success
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isOverloaded = errorMessage.includes('503') || errorMessage.includes('overloaded');

            if (isOverloaded && attempt < maxRetries) {
                console.warn(`Attempt ${attempt} for quiz generation failed due to model overload. Retrying in ${initialDelay * attempt}ms...`);
                await new Promise(resolve => setTimeout(resolve, initialDelay * attempt));
                continue; // Retry
            }

            console.error("Critical error in generateQuizFlow:", error);
            let message = "An unknown error occurred during quiz generation.";
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
    throw new Error("Quiz generation failed after multiple retries.");
  }
);
