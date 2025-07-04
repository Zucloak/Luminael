
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
  OpenEndedQuestion, // Added import for the OpenEndedQuestion type
  // QuestionSchema, // Individual question schemas are part of GenerateHellBoundQuizOutputSchema
  // MultipleChoiceQuestionSchema,
  // ProblemSolvingQuestionSchema,
  // OpenEndedQuestionSchema,
} from '@/lib/types';
import { replaceLatexDelimiters } from '@/lib/utils'; // Import the new utility function

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
    const runner = genkit({
      plugins: [googleAI({apiKey})],
      model: 'googleai/gemini-1.5-flash-latest' // C1: Model specified in runner
    });

    const quizPrompt = `You are an expert AI educator specializing in creating deeply challenging assessments. Your task is to use the provided **Key Concepts** to generate a quiz that tests for true mastery, not just surface-level recall. The questions must be exceptionally difficult and require a high level of critical thinking.

**Key Concepts:**
${context}

ULTRA-CRITICAL RULE #0: ALL MATH MUST BE WRAPPED IN DOLLAR SIGNS! For EVERY piece of mathematical notation, variable, formula, number, or expression (e.g., \`q_1 = 2 \\times 10^{-6} \\text{ C}\`, \`5 \\times 10^{-6} \\text{ C}\`, \`x^2\`, \`v_final\`), it MUST be enclosed in appropriate LaTeX dollar sign delimiters. This applies to question text, all multiple-choice options, and all parts of answers. NO EXCEPTIONS.
- Use ONLY Dollar Sign Delimiters: For INLINE MATH, you MUST use \`\\$...\\$\`. For DISPLAY MATH, you MUST use \`\\$\\$...\\$\\$\`.
- ABSOLUTELY DO NOT use \`\\\\(...\\\\)\` or \`\\\\[...\\\\]\` as math delimiters. Using parenthesis-based delimiters is a FAILURE.
- SINGLE PAIR OF DELIMITERS ONLY: Each distinct mathematical expression must be enclosed by **exactly ONE pair** of appropriate dollar-sign delimiters. For inline math, use \`\\$...\\$\`. For display math, use \`\\$\\$...\\$\\$\`. **NEVER output extra dollar signs before or after a correctly delimited expression.** For example, \`\\$\\$\\boxed{X}\\$\\$\` is CORRECT. \`\\$\\$\\boxed{X}\\$\\$\\$\` (extra \`\\$\` at end) is WRONG. \`\\$\\$\\$\\$\\boxed{X}\\$\\$\\$\\$\` (too many \`\\$\`) is WRONG. Ensure clean, standard usage.
  CORRECT Example for your output: \`\\$q_1 = 2 \\\\times 10^{-6} \\\\text{ C}\\$\`
  CORRECT Example for your output: \`A charge of \\$5 \\\\times 10^{-6} \\\\text{ C}\\$ is moved...\`
  CORRECT Example for your output: \`...electric field of strength \\$10^4 \\\\text{ N/C}\\$... \`
  INCORRECT (MISSING DOLLAR SIGNS!): \`(q_1 = 2 \\times 10^{-6} \\text{ C})\`
  INCORRECT (WRONG DELIMITERS!): \`\\\\(q_1 = 2 \\\\times 10^{-6} \\\\text{ C}\\\\)\`
FAILURE TO WRAP ALL MATH IN DOLLAR SIGNS, OR USING WRONG DELIMITERS, OR USING EXTRA/MISPLACED DELIMITERS, WILL RESULT IN UNRENDERED TEXT AND IS A CRITICAL ERROR.

**LISTS AND STEPS: IMPORTANT FORMATTING:**
For any step-by-step explanations, derivations, or itemized lists in your answers, YOU MUST use standard Markdown numbered lists (e.g., \`1. First step.\\n2. Second step with math \\$x=y\\$.\`).
DO NOT use LaTeX environments like \`\\\\begin{enumerate}\`, \`\\\\end{enumerate}\`, \`\\\\begin{itemize}\`, or \`\\\\item\`. Use Markdown numbering. Any LaTeX math *within* a Markdown list item must still be correctly delimited with dollar signs.

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
9.  **CRITICAL GLOBAL DE-DUPLICATION:** The provided list of \`existingQuestions\` contains titles of ALL previously generated questions in this entire session, regardless of their type. You ABSOLUTELY MUST NOT generate any question (for any format) whose core concept, topic, or specific calculation is substantially similar to ANY question title found in this \`existingQuestions\` list. Ensure maximum diversity and rigorously avoid all forms of repetition. Identical or near-identical questions are unacceptable and a failure.
10. **Impeccable and Robust LaTeX Formatting (RECALL CRITICAL RULE #0 ON WRAPPING ALL MATH IN DOLLAR SIGNS):**
    *   MANDATORY DELIMITERS (Rule #0 REITERATED): ALL math expressions, variables, and symbols (e.g., \`x\`, \`a^2\`, \`(a^2-x^2)\`) MUST be enclosed in \`\\$...\\$\` (inline) or \`\\$\\$...\\$\\$\` (display). This applies to the question text, AND for \`multipleChoice\` questions, it also applies to EACH of the options. For \`openEnded\` questions, this applies to the question text and the example answer/discussion points.
    *   Using \`\\\\text{...}\`: When using \`\\\\text{...}\` for units or short textual labels within a formula, keep the content inside simple (e.g., \`\\\\text{Joules}\`, \`\\\\text{m/s}\`). Avoid complex LaTeX or special characters within the \`\\\\text{}\` argument itself. The entire mathematical expression, including these \`\\\\text\` parts, must be enclosed in a single pair of dollar-sign delimiters. Example: \`\\$v = 25 \\\\text{ m/s}\\$\`.
    *   Enclose inline math with single dollar signs (\`\\$...\\$\`). Example: For 'the value is x squared units', output: The value is \\$x^{2}\\$ units.
    *   Enclose block/display math with double dollar signs (\`\\$\\$...\\$\\$\`). Example: \`\\$\\$ E = mc^{2} \\$\\$\`
    *   CRITICAL FOR SUPERSCRIPTS/SUBSCRIPTS: ALWAYS use curly braces for scripts, even for single characters. Examples: \`\\$x^{y}\\$\`, \`\\$a_{b}\\$\`, \`\\$10^{-19}\\$\`, \`\\$z^{6}\\$\`. Incorrect: \`\\$x^y\\$\`, \`\\$a_b\\$\`.
    *   Standard Commands: Use standard LaTeX commands (e.g., \`\\\\sin\`, \`\\\\cos\`, \`\\\\frac{}{}\`, \`\\\\sqrt{}\`, \`\\\\sum_{i=0}^{n}\`, \`\\\\int_{a}^{b}\`, \`\\\\vec{F}\`, \`\\\\alpha\`, \`\\\\beta\`, \`\\\\Delta\`). For example, write \`\\$x = a \\\\sin \\theta\\$\` instead of \`x = a sin θ\`.
    *   Escaping Special LaTeX Characters: If characters like \`#\`, \`_\`, \`^\`, \`{\`, \`}\` are needed as literal text *within* a math environment, they might need escaping (e.g., \`\\\\_\`, \`\\\\{\`). However, for math symbols, use LaTeX commands.
    *   Clarity for Renderer: Ensure there are no ambiguous constructions. For instance, make sure fractions are clearly denoted \`\\\\frac{numerator}{denominator}\`. Ensure matrices or multi-line equations use appropriate LaTeX environments (e.g., \`pmatrix\`, \`align\`, \`cases\`).
    *   VALIDATE CHARACTER ENCODING: Output must use standard UTF-8 encoding. Avoid non-standard Unicode symbols, invisible characters, or control characters within or directly adjacent to LaTeX code, as these can break rendering. Use standard keyboard characters and defined LaTeX commands.
    *   DO NOT use Markdown for math. Only use LaTeX within dollar signs.
    *   DO NOT use non-standard or custom LaTeX commands.
    *   DO NOT use parentheses for math delimiters like \`\\\\(\` or \`\\\\)\`. Only use dollar signs.
    *   Test your LaTeX output mentally: Ensure every mathematical element is correctly delimited per CRITICAL RULE #0.
    *   BOXED ANSWERS: When using the \`\\\\boxed{...}\` command for final answers in problem-solving solutions, ensure this command and its argument are themselves enclosed within display math delimiters, like so: \`\\$\\$\\\\boxed{your final answer}\\$\\$\`.

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

            // Capture raw questions for debugging BEFORE ANY modification
            const rawQuestionsForDebug = JSON.parse(JSON.stringify(output.quiz?.questions || []));

            // Handle misclassified MultipleChoice questions (e.g., with "string" or "No options provided" options)
            if (output.quiz && output.quiz.questions) {
              output.quiz.questions = output.quiz.questions.map(q => {
                if (q.questionType === 'multipleChoice') {
                  let isMisclassified = false;
                  if (q.options && q.options.length > 0) {
                    const allOptionsArePlaceholders = q.options.every(opt => {
                      const optText = (opt || "").trim().toLowerCase();
                      return optText === "string" ||
                             optText.startsWith("no options provided") ||
                             optText.startsWith("placeholder") ||
                             optText.includes("lorem ipsum");
                    });
                    if (allOptionsArePlaceholders) {
                      isMisclassified = true;
                      console.warn(`[generateHellBoundQuizFlow] Misclassified MC question (title: "${q.question.substring(0, 30)}...") identified with placeholder options.`);
                    } else {
                      // Check for duplicate options within this specific question's options array
                      const uniqueOptions = new Set(q.options.map(opt => (opt || "").trim()));
                      if (uniqueOptions.size < q.options.length) {
                        console.warn(`[generateHellBoundQuizFlow] Question (title: "${q.question.substring(0, 30)}...") has duplicate options. The AI should provide distinct options.`);
                      }
                    }
                  } else if (!q.options || q.options.length === 0) {
                    isMisclassified = true;
                    console.warn(`[generateHellBoundQuizFlow] Misclassified MC question (title: "${q.question.substring(0, 30)}...") identified with missing/empty options.`);
                  }

                  if (isMisclassified) {
                    // Create a new OpenEndedQuestion object
                    // Ensure OpenEndedQuestion is imported from '@/lib/types'
                    const { question, answer } = q; // Destructure relevant fields
                    const newOpenEndedQuestion: OpenEndedQuestion = { // Explicitly type
                      questionType: 'openEnded',
                      question,
                      answer,
                    };
                    return newOpenEndedQuestion;
                  }
                }
                return q; // Return original question if no transformation needed
              });
            }

            // Correction for "Option A" style answers BEFORE delimiter replacement
            if (output.quiz && output.quiz.questions) {
              // Note: output.quiz.questions might have been re-assigned by the .map() above
              output.quiz.questions.forEach(q => { // .forEach is fine here
                if (q.questionType === 'multipleChoice' && q.options && q.options.length > 0 && q.answer) {
                  const answerText = q.answer.trim().toLowerCase();
                  let correctedAnswer = q.answer;
                  if (answerText === 'option a' && q.options[0] !== undefined) {
                    correctedAnswer = q.options[0];
                  } else if (answerText === 'option b' && q.options[1] !== undefined) {
                    correctedAnswer = q.options[1];
                  } else if (answerText === 'option c' && q.options[2] !== undefined) {
                    correctedAnswer = q.options[2];
                  } else if (answerText === 'option d' && q.options[3] !== undefined) {
                    correctedAnswer = q.options[3];
                  }
                  q.answer = correctedAnswer;
                }

                // Additional check: After "Option A/B/C/D" correction, does the answer match an option?
                if (q.questionType === 'multipleChoice') {
                    const currentAnswer = typeof q.answer === 'string' ? q.answer : '';
                    // Ensure q.options is an array of strings. It might have been deleted if question was reclassified.
                    const currentOptions = (Array.isArray((q as any).options) ? (q as any).options.filter((opt: any) => typeof opt === 'string') : []) as string[];

                    if (currentOptions.length > 0 && !currentOptions.includes(currentAnswer)) {
                        console.warn(`[generateHellBoundQuizFlow] AI Adherence Warning for question (title: "${q.question.substring(0, 30)}..."): The AI's answer "${currentAnswer}" does not exactly match any of the options: ${JSON.stringify(currentOptions)}. The AI is expected to provide an answer that is an exact textual match to one of the options.`);
                        // No programmatic change to q.answer here.
                    }
                }
              });
            }

            // Apply delimiter replacement to all relevant fields
            if (output.quiz && output.quiz.questions) {
               // Note: output.quiz.questions might have been re-assigned by the .map()
              output.quiz.questions.forEach(q => {
                if (q.question) q.question = replaceLatexDelimiters(q.question);
                if (q.answer) q.answer = replaceLatexDelimiters(q.answer);
                // Ensure q has 'options' and it's an array before mapping
                if (q.questionType === 'multipleChoice' && q.options && Array.isArray(q.options)) {
                  q.options = q.options.map(opt => typeof opt === 'string' ? replaceLatexDelimiters(opt) : opt);
                }
              });
            }

            (output as any).rawAiOutputForDebugging = rawQuestionsForDebug; // Attach the original raw questions

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
