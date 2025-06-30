
'use server';
/**
 * @fileOverview AI agent that generates a super difficult quiz related to the uploaded files.
 *
 * - generateHellBoundQuiz - A function that handles the quiz generation process.
 * - GenerateHellBoundQuizInput - The input type for the generateHellBoundQuiz function.
 * - GenerateHellBoundQuizOutput - The return type for the generateHellBoundQuiz function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const FileContentSchema = z.object({
  name: z.string().describe("The name of the file."),
  content: z.string().describe("The text content of the file."),
});

const GenerateHellBoundQuizInputSchema = z.object({
  files: z.array(FileContentSchema)
    .describe('An array of files, each with a name and its text content.'),
  numQuestions: z.number().describe('The number of questions to generate for this batch.'),
  existingQuestions: z.array(z.string()).optional().describe('A list of questions already generated, to avoid duplicates.'),
  apiKey: z.string().optional().describe('Optional Gemini API key.'),
});
export type GenerateHellBoundQuizInput = z.infer<typeof GenerateHellBoundQuizInputSchema>;

const MultipleChoiceQuestionSchema = z.object({
  questionType: z.enum(['multipleChoice']).describe("The type of the question."),
  question: z.string().describe('The question text, derived ONLY from the provided material and in the same language. All mathematical notation MUST be properly formatted in LaTeX and enclosed in single ($...$) or double ($$...$$) dollar signs for rendering.'),
  options: z.array(z.string().describe('A multiple-choice option, derived ONLY from the provided material and in the same language. All mathematical notation MUST be properly formatted in LaTeX and enclosed in single ($...$) or double ($$...$$) dollar signs.')).length(4).describe('An array of 4 multiple-choice options.'),
  answer: z.string().describe('The correct answer, which must be one of the provided options, derived ONLY from the provided material and in the same language. All mathematical notation MUST be properly formatted in LaTeX and enclosed in single ($...$) or double ($$...$$) dollar signs.'),
});

const OpenEndedQuestionSchema = z.object({
  questionType: z.enum(['openEnded']).describe("The type of the question."),
  question: z.string().describe('The problem-solving or open-ended question, derived ONLY from the provided material and in the same language. All mathematical notation MUST be properly formatted in LaTeX and enclosed in single ($...$) or double ($$...$$) dollar signs for rendering.'),
  answer: z.string().describe('The detailed, correct solution to the problem, derived ONLY from the provided material and in the same language. All mathematical notation MUST be properly formatted in LaTeX and enclosed in single ($...$) or double ($$...$$) dollar signs.'),
});

const QuestionSchema = z.union([MultipleChoiceQuestionSchema, OpenEndedQuestionSchema]);


const GenerateHellBoundQuizOutputSchema = z.object({
  quiz: z.object({
      questions: z.array(QuestionSchema).refine(items => items.every(item => item.question.trim() !== '' && !item.question.toLowerCase().includes("lorem ipsum")), {
        message: 'Question text cannot be empty or placeholder text.',
      }),
  }).describe('The generated quiz.'),
});
export type GenerateHellBoundQuizOutput = z.infer<typeof GenerateHellBoundQuizOutputSchema>;

export async function generateHellBoundQuiz(input: GenerateHellBoundQuizInput): Promise<GenerateHellBoundQuizOutput> {
  return generateHellBoundQuizFlow(input);
}

const generateHellBoundQuizFlow = ai.defineFlow(
  {
    name: 'generateHellBoundQuizFlow',
    inputSchema: GenerateHellBoundQuizInputSchema,
    outputSchema: GenerateHellBoundQuizOutputSchema,
  },
  async ({ files, numQuestions, existingQuestions, apiKey }) => {
    const runner = apiKey ? genkit({ plugins: [googleAI({apiKey})] }) : ai;
    
    const CONTENT_THRESHOLD = 15000;
    const BATCH_DELAY = 5000; // 5 seconds
    
    const processedFileContents: string[] = [];

    for (const file of files) {
        let fileContent = file.content;

        if (fileContent.length > CONTENT_THRESHOLD) {
            const chunks: string[] = [];
            for (let i = 0; i < fileContent.length; i += CONTENT_THRESHOLD) {
                chunks.push(fileContent.substring(i, i + CONTENT_THRESHOLD));
            }
            
            const summarizedChunks: string[] = [];
            for (const [index, chunk] of chunks.entries()) {
                const summarizePrompt = `You are a text distillation AI with a "HELL BOUND" persona. The following raw text is chunk ${index + 1} of ${chunks.length} from the document "${file.name}". Your task is to forge it into a brutally token-efficient list of the most complex, high-level concepts.

**ABSOLUTE COMMANDS:**
1.  **Identify and Obey Language:** Determine the primary language of the raw text. You will then write your entire output in *that same language*. Do not translate. Disobedience will not be tolerated.
2.  **Extract the Crux:** Do not summarize simple facts. Your purpose is to distill only the most complex, abstract, and interconnectable ideas. Focus on the core essence that can be used to forge hellishly difficult questions.
3.  **Maximum 5 Concepts:** You MUST return a maximum of 5 key concepts. Use a bulleted list. This is a strict, non-negotiable limit.

**Raw Material Chunk from "${file.name}":**
${chunk}

**Distilled Concepts (Max 5, in original language):`;

                try {
                    const { text } = await runner.generate({
                        model: 'googleai/gemini-1.5-flash-latest',
                        prompt: summarizePrompt,
                    });
                    summarizedChunks.push(text);

                    if (index < chunks.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
                    }
                } catch (error) {
                    console.error(`Error summarizing chunk ${index + 1} from ${file.name}:`, error);
                    if (error instanceof Error && error.message.includes('429')) {
                        throw new Error(`Rate limit exceeded while summarizing a large document (${file.name}). Please wait a minute and try again.`);
                    }
                    throw new Error(`An error occurred while summarizing ${file.name} (chunk ${index + 1}).`);
                }
            }
            fileContent = summarizedChunks.join('\n\n');
        }
        processedFileContents.push(`# File: ${file.name}\n${fileContent}`);
    }

    const processedContent = processedFileContents.join('\n\n---\n\n');

    const quizPrompt = `You are an expert AI educator specializing in creating deeply challenging assessments. Your task is to generate a quiz from the provided content that tests for true mastery, not just surface-level recall. The questions must be exceptionally difficult and require a high level of critical thinking.

**Core Material:**
${processedContent}

**NON-NEGOTIABLE RULES:**
1.  **Strictly Adhere to Content:** You are strictly forbidden from using any external knowledge. Every question, option, and answer MUST be directly derived from the Core Material provided. If the material is a story, do not ask about geography. The file structure (e.g., "# File: ...") is for context; synthesize information across files.
2.  **Obey the Language:** The entire quiz MUST be in the same language as the Core Material. If the material is in Filipino, the quiz must be in Filipino. No exceptions.
3.  **Generate Exactly ${numQuestions} Questions:** You are required to generate exactly the number of questions requested. Re-read the material to find more details if necessary. Do not stop early.
4.  **No Placeholders or Garbage:** Under no circumstances are you to output placeholder text like "Lorem Ipsum" or generic, unrelated questions (e.g., "What is the capital of France?", "What is a quick brown rabbit?"). This is an instant failure.
5.  **Prioritize Synthesis:** Questions must force the user to synthesize information from multiple sections of the text.
6.  **Devious Distractors:** For multiple-choice questions, the incorrect options must be highly plausible and designed to trap common misconceptions based on the text.
7.  **Avoid Duplicates:** Do not repeat concepts or questions. Avoid asking about questions from this list: ${existingQuestions && existingQuestions.length > 0 ? JSON.stringify(existingQuestions) : 'None'}.
8.  **Impeccable LaTeX Formatting:** For any mathematical equations or symbols, you MUST use proper LaTeX formatting.
    -   Enclose inline math with single dollar signs (\`$...$\`).
    -   Enclose block math with double dollar signs (\`$$...$$\`).
    -   **CRITICAL:** For multi-character superscripts or subscripts, you MUST use curly braces. For example: write \`$10^{-19}$\` NOT \`$10^-19$\`. Write \`$U_{235}$\` NOT \`$U_235$\`.
    -   **DO NOT** use parentheses for math, such as \`\\(\` or \`\\)\`. Only use dollar signs.

**Output Mandate:**
You MUST provide your response in the specified JSON format. Failure is not an option.`;

    const {output} = await runner.generate({
        model: 'googleai/gemini-1.5-flash-latest',
        prompt: quizPrompt,
        output: {
            format: 'json',
            schema: GenerateHellBoundQuizOutputSchema,
        }
    });

    return output!;
  }
);
