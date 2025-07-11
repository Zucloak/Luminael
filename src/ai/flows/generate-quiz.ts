
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
  OpenEndedQuestion, // Added import for the OpenEndedQuestion type
  // Individual question schemas are used by GenerateQuizOutputSchema which is imported
  // MultipleChoiceQuestionSchema,
  // ProblemSolvingQuestionSchema,
  // OpenEndedQuestionSchema,
  // QuestionSchema
} from '@/lib/types'; // Import schemas and types
import { replaceLatexDelimiters } from '@/lib/utils'; // Import the new utility function

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
  async ({ context, numQuestions, difficulty, questionFormat, existingQuestions, apiKey, problemSpecificOcrText }: GenerateQuizInput): Promise<GenerateQuizOutput> => {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error("A valid API Key is required for generateQuizFlow but was not provided or was empty.");
    }
    const runner = genkit({
      plugins: [googleAI({apiKey})],
      model: 'googleai/gemini-1.5-flash-latest' // Explicitly set model for this runner
    });

    let activePromptText; // Renamed to avoid confusion with the final prompt structure for AI
    let finalPromptPayload: any; // To hold either string or Parts array

    if (questionFormat === 'problemSolving') {
      activePromptText = `You are an AI assistant laser-focused on generating calculative problems. Your SOLE task is to generate exactly ${numQuestions} procedural, computation-based problems based on the **Key Concepts** provided below.

**Key Concepts:**
${context}

ULTRA-CRITICAL RULE #0: ALL MATH MUST BE WRAPPED IN DOLLAR SIGNS! For EVERY piece of mathematical notation, variable, formula, number, or expression (e.g., \`q_1 = 2 \\times 10^{-6} \\text{ C}\`, \`5 \\times 10^{-6} \\text{ C}\`, \`x^2\`, \`v_final\`), it MUST be enclosed in appropriate LaTeX dollar sign delimiters. This applies to question text, all multiple-choice options, and all parts of answers. NO EXCEPTIONS.
- Use ONLY Dollar Sign Delimiters: For INLINE MATH, you MUST use \`\\$...\\$\`. For DISPLAY MATH, you MUST use \`\\$\\$...\\$\\$\`.
- ABSOLUTELY DO NOT use \`\\\\(...\\\\)\` or \`\\\\[...\\\\]\` as math delimiters. Using parenthesis-based delimiters is a FAILURE.
- **CRITICALLY DO NOT use \`\\\\\\$\` (a backslash followed by a dollar sign) as your math delimiter.** Use only unescaped \`\\$\` or \`\\$\\$\` as instructed above for starting and ending math content. \`\\\\\\$\` is for outputting a literal dollar sign character, NOT for delimiting math.
- **CRITICALLY DO NOT use \`\\\\\\$\` (a backslash followed by a dollar sign) as your math delimiter.** Use only unescaped \`\\$\` or \`\\$\\$\` as instructed above for starting and ending math content. \`\\\\\\$\` is for outputting a literal dollar sign character, NOT for delimiting math.
- SINGLE PAIR OF DELIMITERS ONLY: Each distinct mathematical expression must be enclosed by **exactly ONE pair** of appropriate dollar-sign delimiters. For inline math, use \`\\$...\\$\`. For display math, use \`\\$\\$...\\$\\$\`. **NEVER output extra dollar signs before or after a correctly delimited expression.** For example, \`\\$\\$\\boxed{X}\\$\\$\` is CORRECT. \`\\$\\$\\boxed{X}\\$\\$\\$\` (extra \`\\$\` at end) is WRONG. \`\\$\\$\\$\\$\\boxed{X}\\$\\$\\$\\$\` (too many \`\\$\`) is WRONG. Ensure clean, standard usage.
  CORRECT Example for your output: \`\\$q_1 = 2 \\\\times 10^{-6} \\\\text{ C}\\$\`
  CORRECT Example for your output: \`A charge of \\$5 \\\\times 10^{-6} \\\\text{ C}\\$ is moved...\`
  CORRECT Example for your output: \`...electric field of strength \\$10^4 \\\\text{ N/C}\\$... \`
  INCORRECT (MISSING DOLLAR SIGNS!): \`(q_1 = 2 \\times 10^{-6} \\text{ C})\`
  INCORRECT (WRONG DELIMITERS!): \`\\\\(q_1 = 2 \\\\times 10^{-6} \\\\text{ C}\\\\)\`
FAILURE TO WRAP ALL MATH IN DOLLAR SIGNS, OR USING WRONG DELIMITERS, OR USING EXTRA/MISPLACED DELIMITERS, WILL RESULT IN UNRENDERED TEXT AND IS A CRITICAL ERROR.

**ABSOLUTE NON-NEGOTIABLE RULES FOR THIS TASK (Problem Solving Questions ONLY):**
1.  **ONLY 'problemSolving' Questions**: Every single question you generate MUST be a procedural, computation-based problem that requires a step-by-step derivation to reach a numeric or symbolic answer. Each question's \`questionType\` field MUST be set to exactly \`problemSolving\`.
2.  **STRICT Schema Adherence**: Each generated question object MUST strictly conform to the ProblemSolvingQuestionSchema: \`{ questionType: 'problemSolving', question: string, answer: string (detailed step-by-step solution, ideally with a \\\\boxed{final_answer}) }\`.
3.  **NO OTHER QUESTION TYPES**: Under NO circumstances are you to generate any \`multipleChoice\` questions or any \`openEnded\` (conceptual, theoretical, discussion-based) questions. Your output MUST NOT contain \`options\` fields (which belong to \`multipleChoice\`) or questions that ask for explanations or opinions. If the Key Concepts do not lend themselves to ${numQuestions} distinct calculative problems, generate as many as possible up to ${numQuestions}, but DO NOT substitute with other types.
4.  **Content Adherence**: All questions and solutions MUST be directly derived from the provided Key Concepts. No external knowledge.
5.  **Language**: The entire quiz MUST be in the same language as the Key Concepts.
6.  **Number of Questions**: Generate up to ${numQuestions} questions as specified. If fewer calculative problems can be derived, that is acceptable.
7.  **CRITICAL GLOBAL DE-DUPLICATION:** The provided list of \`existingQuestions\` contains titles of ALL previously generated questions in this entire session, regardless of their type. You ABSOLUTELY MUST NOT generate any question (for any format) whose core concept, topic, or specific calculation is substantially similar to ANY question title found in this \`existingQuestions\` list. Ensure maximum diversity and rigorously avoid all forms of repetition. Identical or near-identical questions are unacceptable and a failure.
8.  **Difficulty**: Calibrate questions to a '${difficulty}' level.
9.  **Impeccable and Robust LaTeX Formatting (RECALL CRITICAL RULE #0 ON WRAPPING ALL MATH IN DOLLAR SIGNS):**
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
    *   **BOXED CONTENT (ABSOLUTE RULE):** ALL uses of the \`\\\\boxed{...}\` command (e.g., for final answers or important formulas) MUST be enclosed in DISPLAY MATH delimiters: \`\\$\\$\\\\boxed{your content}\\$\\$\`. Inline boxing (\`\\$\\\\boxed{...}\\$\`) is FORBIDDEN.
    *   **DISPLAY VS. INLINE MATH:** Use \`\\$\\$...\\$\\$\` for standalone equations, significant fractions, summations, integrals, matrices, or any multi-line mathematical expressions. Use \`\\$...\\$\` for smaller, inline mathematical elements that are part of a sentence's flow.
    *   **INTERNAL LATEX INTEGRITY (ESPECIALLY FOR COMPLEX STRUCTURES):**
        *   When constructing complex expressions such as fractions (e.g., \`\\\\frac{numerator}{denominator}\`), square roots (e.g., \`\\\\sqrt{content}\`), or boxed content (e.g., \`\\\\boxed{content}\`), ensure that the \`numerator\`, \`denominator\`, or \`content\` (the material inside the curly braces \`{...}\` of these commands) is a single, complete, and syntactically valid LaTeX snippet *relative to its own context*.
        *   **CRITICAL:** Avoid prematurely closing the overall math mode with a '$' or '$$' *inside* such structures if the entire structure is already meant to be part of a larger delimited math expression. Also, ensure correct pairing and nesting of curly braces '{}'.
        *   For example, if the overall expression is meant to be '\$\$ \boxed{ \text{expression} } \$\$', then 'expression' itself must not contain unescaped '$' or '$$' that would break the box's content into separate math modes.
        *   **INCORRECT EXAMPLE to avoid:** '\$\$ \boxed{ V = \frac{kQ}{ \sqrt{x^2+R^2} } \$ } \$\$' (The '\$' after 'R^2}' is bad, breaking the box).
        *   **INCORRECT EXAMPLE to avoid:** '\$\$ \boxed{ V = \frac{kQ}\$ \${ \sqrt{x^2+R^2} } } \$\$' (The 'kQ}\$ \${ \sqrt...' part is bad, breaking the fraction and box content due to misplaced '$' and '{').
        *   **CORRECT APPROACH for similar structure:** '\$\$ \boxed{ V = \frac{kQ}{\sqrt{x^2+R^2}} } \$\$' (The entire 'V = ...' part is a single, well-formed LaTeX expression within the '\boxed{}' before the final '\$\$' delimiters are applied).

**LISTS AND STEPS (ESPECIALLY FOR PROBLEM-SOLVING ANSWERS):**
For any step-by-step explanations, derivations, or itemized lists in your answers:
1.  **PRIMARY METHOD: Use standard Markdown numbered lists** (e.g., \`1. First step.\\n2. Second step with math \\$x=y\\$.\`).
2.  **LaTeX Math within Markdown:** Any LaTeX math *within* a Markdown list item must still be correctly delimited with appropriate dollar signs (\`\\$...\\$\` or \`\\$\\$...\\$\\$\`).
3.  **Complex Equations within a Step:** If a single step in a derivation involves a complex multi-line equation (e.g., using an \`align\` environment), that specific equation block SHOULD be wrapped in \`\\$\\$...\\$\\$\`.
4.  **AVOID LaTeX List Environments:** DO NOT use top-level LaTeX environments like \`\\\\begin{enumerate}\`, \`\\\\end{enumerate}\`, \`\\\\begin{itemize}\`, or \`\\\\item\` to create the overall list structure. Use Markdown for the list itself.

**Output Format Mandate:**
You MUST provide your response as a JSON object that strictly conforms to the GenerateQuizOutputSchema, containing a 'quiz' object, which in turn contains a 'questions' array. EACH question object in this array MUST be a ProblemSolvingQuestionSchema object.
`;
    } else {
      // Existing comprehensive prompt for multipleChoice, openEnded, mixed
      activePromptText = `You are an expert AI educator. Your task is to generate a quiz based on the **Key Concepts** provided below.

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

**NON-NEGOTIABLE RULES (for 'multipleChoice', 'openEnded', 'mixed' formats):**
1.  **Strictly Adhere to Content:** You are strictly forbidden from using any external knowledge. All questions, options, and answers MUST be directly derived from the Key Concepts provided.
2.  **Obey the Language:** The entire quiz MUST be in the same language as the Key Concepts.
3.  **Generate Exactly ${numQuestions} Questions:** You are required to generate exactly the number of questions requested.
4.  **Strict Question Format Adherence & Type Integrity:**
    *   **If '${questionFormat}' is 'multipleChoice'**:
        *   Generate **ONLY** multiple-choice questions. Each question MUST have its \`questionType\` field set to exactly \`multipleChoice\`.
        *   Provide 4 distinct options. The \`answer\` field must exactly match one of the \`options\`.
        *   Output JSON for these questions MUST conform to the MultipleChoiceQuestionSchema.
        *   **ABSOLUTE CRITICAL DIRECTIVE for 'multipleChoice' format**: Under NO CIRCUMSTANCES are you to generate any \`problemSolving\` questions or any \`openEnded\` (conceptual, theoretical, discussion-based) questions when '${questionFormat}' is 'multipleChoice'. Your output MUST NOT contain detailed step-by-step solutions for calculations (which belong to \`problemSolving\`) or ask for explanations/opinions (which belong to \`openEnded\`). Failure to adhere to this strict exclusivity for 'multipleChoice' format questions will render the output unusable. You must focus entirely and exclusively on multiple-choice questions that fit the MultipleChoiceQuestionSchema.
    *   **If '${questionFormat}' is 'openEnded'**:
        *   Generate **ONLY** theoretical, opinion-based, or conceptual questions. Each question MUST have its \`questionType\` field set to exactly \`openEnded\`.
        *   These questions require free-form, textual answers. The \`answer\` field should provide a model answer or key discussion points.
        *   **ABSOLUTE CRITICAL DIRECTIVE for 'openEnded' format**: Under NO CIRCUMSTANCES are you to generate any \`multipleChoice\` questions or any \`problemSolving\` (calculative) questions when '${questionFormat}' is 'openEnded'. Your output MUST NOT contain \`options\` fields (which belong to \`multipleChoice\`) or present problems that require a definitive numeric/symbolic calculative answer (which belong to \`problemSolving\`). Failure to adhere to this strict exclusivity for 'openEnded' format questions will render the output unusable. Focus exclusively on conceptual, theoretical, or opinion-based questions requiring textual, explanatory answers. Output JSON for these questions MUST conform to the OpenEndedQuestionSchema.
    *   **If '${questionFormat}' is 'mixed'**:
        *   Generate a balanced blend of \`multipleChoice\`, \`problemSolving\` (calculative, as defined below), and \`openEnded\` (conceptual, as defined above) questions.
        *   Ensure each question generated correctly sets its \`questionType\` field and conforms to its respective schema (MultipleChoiceQuestionSchema, ProblemSolvingQuestionSchema, or OpenEndedQuestionSchema).
        *   For 'problemSolving' questions within mixed mode: They MUST be procedural, computation-based problems requiring a step-by-step derivation leading to a specific numeric or symbolic answer. The \`answer\` field MUST contain a detailed, step-by-step solution. The final answer in the solution should ideally be boxed (e.g., using \`\\\\boxed{answer}\`).
    *   **Universal Type Integrity**: Do not misclassify question types. For example, a question asking for an explanation of a concept is \`openEnded\`. A question requiring a calculation is \`problemSolving\`. Adhere strictly to the definitions.

5.  **Schema Adherence & No Garbage:** All fields (\`question\`, \`options\` (if applicable), \`answer\`, \`questionType\`) MUST contain meaningful, relevant content derived ONLY from the provided Key Concepts. Do not use generic placeholders. For multiple-choice questions, all four options must be distinct and plausible. Ensure every generated question object perfectly matches its corresponding schema (MultipleChoiceQuestionSchema, ProblemSolvingQuestionSchema, or OpenEndedQuestionSchema) based on its \`questionType\`.
6.  **Difficulty:** Calibrate the questions to a '${difficulty}' level.
7.  **CRITICAL GLOBAL DE-DUPLICATION:** The provided list of \`existingQuestions\` contains titles of ALL previously generated questions in this entire session, regardless of their type. You ABSOLUTELY MUST NOT generate any question (for any format) whose core concept, topic, or specific calculation is substantially similar to ANY question title found in this \`existingQuestions\` list. Ensure maximum diversity and rigorously avoid all forms of repetition. Identical or near-identical questions are unacceptable and a failure.
8.  **Impeccable and Robust LaTeX Formatting (RECALL CRITICAL RULE #0 ON WRAPPING ALL MATH IN DOLLAR SIGNS):**
    *   MANDATORY DELIMITERS (Rule #0 REITERATED): ALL math expressions, variables, and symbols (e.g., \`x\`, \`a^2\`, \`(a^2-x^2)\`) MUST be enclosed in \`\\$...\\$\` (inline) or \`\\$\\$...\\$\\$\` (display). This applies to the question text, AND for \`multipleChoice\` questions, it also applies to EACH of the options. For \`openEnded\` questions, this applies to the question text and the example answer/discussion points.
    *   Using \`\\\\text\` for Units/Annotations: When using \`\\\\text{...}\` for units or text within a mathematical formula, the ENTIRE formula, including the \`\\\\text{...}\` portion, MUST be enclosed within a single pair of LaTeX dollar-sign delimiters (as shown in CRITICAL RULE #0 examples).
    *   Enclose inline math with single dollar signs (\`\\$...\\$\`). Example: For 'the value is x squared units', output: The value is \\$x^{2}\\$ units.
    *   Enclose block/display math with double dollar signs (\`\\$\\$...\\$\\$\`). Example: \`\\$\\$ E = mc^{2} \\$\\$\`
    *   CRITICAL FOR SUPERSCRIPTS/SUBSCRIPTS: ALWAYS use curly braces for scripts, even for single characters. Examples: \`\\$x^{y}\\$\`, \`\\$a_{b}\\$\`, \`\\$10^{-19}\\$\`, \`\\$z^{6}\\$\`. Incorrect: \`\\$x^y\\$\`, \`\\$a_b\\$\`.
    *   Standard Commands: Use standard LaTeX commands (e.g., \`\\\\sin\`, \`\\\\cos\`, \`\\\\frac{}{}\`, \`\\\\sqrt{}\`, \`\\\\sum_{i=0}^{n}\`, \`\\\\int_{a}^{b}\`, \`\\\\vec{F}\`, \`\\\\alpha\`, \`\\\\beta\`, \`\\\\Delta\`). For example, write \`\\$x = a \\\\sin \\theta\\$\` instead of \`x = a sin θ\`.
    *   Escaping Special LaTeX Characters: If characters like \`#\`, \`_\`, \`^\`, \`{\`, \`}\` are needed as literal text *within* a math environment, they might need escaping (e.g., \`\\\\_\`, \`\\\\{\`). However, for math symbols, use LaTeX commands.
    *   Clarity for Renderer: Ensure there are no ambiguous constructions. For instance, make sure fractions are clearly denoted \`\\\\frac{numerator}{denominator}\`. Ensure matrices or multi-line equations use appropriate LaTeX environments (e.g., \`pmatrix\`, \`align\`, \`cases\`).
    *   DO NOT use Markdown for math. Only use LaTeX within dollar signs.
    *   DO NOT use non-standard or custom LaTeX commands.
    *   DO NOT use parentheses for math delimiters like \`\\(\` or \`\\)\`. Only use dollar signs.
    *   Test your LaTeX output mentally: Ensure every mathematical element is correctly delimited per CRITICAL RULE #0.
    *   **BOXED CONTENT (ABSOLUTE RULE):** ALL uses of the \`\\\\boxed{...}\` command (e.g., for final answers or important formulas) MUST be enclosed in DISPLAY MATH delimiters: \`\\$\\$\\\\boxed{your content}\\$\\$\`. Inline boxing (\`\\$\\\\boxed{...}\\$\`) is FORBIDDEN. This applies to questions, options, and answers.
    *   **DISPLAY VS. INLINE MATH:** Use \`\\$\\$...\\$\\$\` for standalone equations, significant fractions, summations, integrals, matrices, or any multi-line mathematical expressions. Use \`\\$...\\$\` for smaller, inline mathematical elements that are part of a sentence's flow. This applies to questions, options, and answers.

**LISTS AND STEPS (ESPECIALLY FOR OPEN-ENDED/PROBLEM-SOLVING ANSWERS):**
For any step-by-step explanations, derivations, or itemized lists in your answers:
1.  **PRIMARY METHOD: Use standard Markdown numbered lists** (e.g., \`1. First step.\\n2. Second step with math \\$x=y\\$.\`).
2.  **LaTeX Math within Markdown:** Any LaTeX math *within* a Markdown list item must still be correctly delimited with appropriate dollar signs (\`\\$...\\$\` or \`\\$\\$...\\$\\$\`).
3.  **Complex Equations within a Step:** If a single step in a derivation involves a complex multi-line equation (e.g., using an \`align\` environment), that specific equation block SHOULD be wrapped in \`\\$\\$...\\$\\$\`.
4.  **AVOID LaTeX List Environments:** DO NOT use top-level LaTeX environments like \`\\\\begin{enumerate}\`, \`\\\\end{enumerate}\`, \`\\\\begin{itemize}\`, or \`\\\\item\` to create the overall list structure. Use Markdown for the list itself.

**Output Format Mandate:**
You MUST provide your response as a JSON object that strictly conforms to the GenerateQuizOutputSchema.
`;
    }

    // Construct the final prompt payload for Genkit
    // No longer multi-modal for this flow based on new requirements; image is OCR'd to text first.
    finalPromptPayload = activePromptText;
        
    const maxRetries = 3;
    const initialDelay = 2000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const {output} = await runner.generate({
            prompt: finalPromptPayload, // Use the potentially multi-modal payload
            output: {
                format: 'json',
                schema: GenerateQuizOutputSchema
            }
            });
            
            if (!output) {
                throw new Error("The AI failed to generate a quiz. It returned an empty or invalid response.");
            }

            // Capture raw questions for debugging BEFORE ANY modification (including delimiter replacement)
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
                      console.warn(`[generateQuizFlow] Misclassified MC question (title: "${q.question.substring(0, 30)}...") identified with placeholder options.`);
                    } else {
                      // Check for duplicate options within this specific question's options array
                      const uniqueOptions = new Set(q.options.map(opt => (opt || "").trim()));
                      if (uniqueOptions.size < q.options.length) {
                        console.warn(`[generateQuizFlow] Question (title: "${q.question.substring(0, 30)}...") has duplicate options. The AI should provide distinct options.`);
                      }
                    }
                  } else if (!q.options || q.options.length === 0) {
                    isMisclassified = true;
                    console.warn(`[generateQuizFlow] Misclassified MC question (title: "${q.question.substring(0, 30)}...") identified with missing/empty options.`);
                  }

                  if (isMisclassified) {
                    // Create a new OpenEndedQuestion object
                    // Ensure OpenEndedQuestion is imported from '@/lib/types' if not already
                    const { question, answer } = q; // Destructure relevant fields from original `q`
                    const newOpenEndedQuestion: OpenEndedQuestion = {
                      questionType: 'openEnded',
                      question,
                      answer, // Assuming the original 'answer' field contains the open-ended answer
                    };
                    return newOpenEndedQuestion; // Replace the old question with the new one
                  }
                }
                return q; // Return original question if no transformation needed
              });
            }

            // Correction for "Option A" style answers BEFORE delimiter replacement
            if (output.quiz && output.quiz.questions) {
              // Note: output.quiz.questions might have been re-assigned by the .map() above if misclassified questions were handled
              output.quiz.questions.forEach(q => { // .forEach is fine here as we are mutating q.answer or logging
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
                if (q.questionType === 'multipleChoice' && (q as any).options && Array.isArray((q as any).options)) {
                    let currentAnswerStr = typeof q.answer === 'string' ? q.answer : '';
                    const currentOptions = (q as any).options.filter((opt: any): opt is string => typeof opt === 'string');

                    if (currentOptions.length > 0 && !currentOptions.includes(currentAnswerStr)) {
                        console.warn(`[generateQuizFlow] AI Adherence Warning (Original Mismatch) for question (title: "${q.question.substring(0, 30)}..."): The AI's answer "${currentAnswerStr}" does not exactly match any of the options: ${JSON.stringify(currentOptions)}.`);

                        // Attempt to find a match ignoring case and whitespace
                        const matchedOption = currentOptions.find((opt: string) => opt.trim().toLowerCase() === currentAnswerStr.trim().toLowerCase());

                        if (matchedOption) {
                            console.log(`[generateQuizFlow] Corrected AI answer for question "${q.question.substring(0, 30)}..." from "${currentAnswerStr}" to "${matchedOption}" based on case-insensitive match.`);
                            q.answer = matchedOption; // Update q.answer to the exact string from options
                        } else {
                            // If still no match, log a more severe warning.
                            // The prompt is very strict, so this indicates a significant AI deviation.
                            console.error(`[generateQuizFlow] CRITICAL AI ADHERENCE FAILURE (MCQ Answer Mismatch): For question starting with "${q.question.substring(0, 50)}...", the AI's provided answer "${currentAnswerStr}" could NOT be matched to any of the options: ${JSON.stringify(currentOptions)}, even after case-insensitive and whitespace-trimmed comparison. The AI was explicitly and repeatedly instructed that the 'answer' field MUST be an exact string copy of one of the 'options'. This question will likely be unscorable or mis-scored. This is a failure by the AI to follow critical output formatting instructions.`);
                            // Do not assign a default answer, as it would be a guess and could hide the AI's error.
                        }
                    }
                }
              });
            }

            // Apply delimiter replacement to all relevant fields
            // IMPORTANT: Delimiter replacement happens AFTER the answer/option matching logic.
            // This is crucial because matching should be based on the AI's original textual output.
            if (output.quiz && output.quiz.questions) {
              output.quiz.questions.forEach(q => {
                if (q.question) q.question = replaceLatexDelimiters(q.question);
                if (q.answer) q.answer = replaceLatexDelimiters(q.answer); // Answer is now potentially corrected to an exact option string
                if (q.questionType === 'multipleChoice' && (q as any).options && Array.isArray((q as any).options)) {
                  (q as any).options = (q as any).options.map((opt: string) => typeof opt === 'string' ? replaceLatexDelimiters(opt) : opt);
                }
              });
            }

            // Post-generation filtering & flagging for 'problemSolving' mode
            if (questionFormat === 'problemSolving' && output.quiz && output.quiz.questions) {
                const originalCount = output.quiz.questions.length;
                output.quiz.questions = output.quiz.questions.filter(
                    q => q.questionType === 'problemSolving'
                );
                const filteredCount = output.quiz.questions.length;
                if (filteredCount < originalCount) {
                    console.warn(`[generateQuizFlow] Filtered out ${originalCount - filteredCount} non-problemSolving questions for 'problemSolving' mode.`);
                }
                // No longer flagging with hadProblemSpecificOcrText as the feature is removed from this flow's direct input
            }
            // Post-generation filtering for 'multipleChoice' mode
            else if (questionFormat === 'multipleChoice' && output.quiz && output.quiz.questions) {
                const originalCount = output.quiz.questions.length;
                output.quiz.questions = output.quiz.questions.filter(
                    q => q.questionType === 'multipleChoice'
                );
                const filteredCount = output.quiz.questions.length;
                if (filteredCount < originalCount) {
                    console.warn(`[generateQuizFlow] Filtered out ${originalCount - filteredCount} non-multipleChoice questions for 'multipleChoice' mode.`);
                }
            }
            // Post-generation filtering for 'openEnded' mode
            else if (questionFormat === 'openEnded' && output.quiz && output.quiz.questions) {
                const originalCount = output.quiz.questions.length;
                output.quiz.questions = output.quiz.questions.filter(
                    q => q.questionType === 'openEnded'
                );
                const filteredCount = output.quiz.questions.length;
                if (filteredCount < originalCount) {
                    console.warn(`[generateQuizFlow] Filtered out ${originalCount - filteredCount} non-openEnded questions for 'openEnded' mode.`);
                }
            }
            // For 'mixed' mode, no filtering is applied by default as it's expected to have various types.

            // Add the raw (pre-filtering) questions to the output for debugging
            (output as any).rawAiOutputForDebugging = rawQuestionsForDebug;

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
