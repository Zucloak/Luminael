
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
import {z} from 'zod';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const FileContentSchema = z.object({
  name: z.string().describe("The name of the file."),
  content: z.string().describe("The text content of the file."),
});

const GenerateQuizInputSchema = z.object({
  files: z.array(FileContentSchema)
    .describe('An array of files, each with a name and its text content.'),
  numQuestions: z.number().describe('The number of questions to generate for this batch.'),
  difficulty: z.string().describe('The difficulty level of the quiz.'),
  questionFormat: z.enum(['multipleChoice', 'openEnded', 'mixed']).describe("The desired format for the quiz questions."),
  existingQuestions: z.array(z.string()).optional().describe('A list of questions already generated, to avoid duplicates.'),
  apiKey: z.string().optional().describe('Optional Gemini API key.'),
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

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

const GenerateQuizOutputSchema = z.object({
  quiz: z.object({
      questions: z.array(QuestionSchema).refine(items => items.every(item => item.question.trim() !== '' && !item.question.toLowerCase().includes("lorem ipsum")), {
        message: 'Question text cannot be empty or placeholder text.',
      }),
  }).describe('The generated quiz.'),
});
export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;

export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  return generateQuizFlow(input);
}

const generateQuizFlow = ai.defineFlow(
  {
    name: 'generateQuizFlow',
    inputSchema: GenerateQuizInputSchema,
    outputSchema: GenerateQuizOutputSchema,
  },
  async ({ files, numQuestions, difficulty, questionFormat, existingQuestions, apiKey }) => {
    const runner = apiKey ? genkit({ plugins: [googleAI({apiKey})] }) : ai;
    
    const CONTENT_THRESHOLD = 20000;
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
                const summarizePrompt = `You are a highly intelligent text processing AI. The following content is chunk ${index + 1} of ${chunks.length} from the document "${file.name}". Your task is to create a token-efficient summary of this chunk that will be used to generate a quiz.

**CRITICAL INSTRUCTIONS:**
1.  **Identify Language:** First, determine the primary language of the original content.
2.  **Summarize in Same Language:** You MUST write your summary in the *exact same language* you identified. Do not translate. If the original content is in Filipino, the summary must be in Filipino.
3.  **Focus on Quiz-Worthy Material:** Do not create a generic summary. Instead, extract and condense the key concepts, main characters, plot points, definitions, and important facts. The goal is to create a dense, fact-rich summary suitable for generating detailed quiz questions.

**Content Chunk from "${file.name}":**
${chunk}

**Fact-Rich Summary of this Chunk (in the original language):`;
                
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

    const quizPrompt = `You are an AI assistant tasked with creating a quiz based on the provided content.

**Content:**
${processedContent}

**NON-NEGOTIABLE RULES:**
1.  **Strictly Adhere to Content:** You are strictly forbidden from using any external knowledge. Every question, option, and answer MUST be directly derived from the Content provided. The file structure (e.g., "# File: ...") is for context; synthesize information across files.
2.  **Obey the Language:** The entire quiz MUST be in the same language as the Content. If the content is in Filipino, the quiz must be in Filipino. No exceptions.
3.  **Generate Exactly ${numQuestions} Questions:** You are required to generate exactly the number of questions requested. Re-read the content to find more details if necessary. Do not stop early.
4.  **No Placeholders or Garbage:** Under no circumstances are you to output placeholder text like "Lorem Ipsum" or generic, unrelated questions (e.g., "What is the capital of France?", "What is a quick brown fox?"). This is an instant failure.
5.  **Question Format:** Adhere to the requested format: '${questionFormat}'.
6.  **Difficulty:** Calibrate the questions to a '${difficulty}' level based on the content.
7.  **Avoid Duplicates:** Do not generate questions that are identical or too similar to these existing questions: ${existingQuestions && existingQuestions.length > 0 ? JSON.stringify(existingQuestions) : 'None'}.
8.  **Impeccable LaTeX Formatting:** For any mathematical equations or symbols, you MUST use proper LaTeX formatting.
    -   Enclose inline math with single dollar signs (\`$...$\`).
    -   Enclose block math with double dollar signs (\`$$...$$\`).
    -   **CRITICAL:** For multi-character superscripts or subscripts, you MUST use curly braces. For example: write \`$10^{-19}$\` NOT \`$10^-19$\`. Write \`$U_{235}$\` NOT \`$U_235$\`.
    -   **DO NOT** use parentheses for math, such as \`\\(\` or \`\\)\`. Only use dollar signs.

**Output Format:**
You MUST provide your response in the specified JSON format.`;
    
    const {output} = await runner.generate({
      model: 'googleai/gemini-1.5-flash-latest',
      prompt: quizPrompt,
      output: {
          format: 'json',
          schema: GenerateQuizOutputSchema
      }
    });
    
    return output!;
  }
);
