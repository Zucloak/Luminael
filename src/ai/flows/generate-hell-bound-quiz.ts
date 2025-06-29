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

const GenerateHellBoundQuizInputSchema = z.object({
  fileContent: z
    .string()
    .describe('The content of the uploaded files, which may span multiple subjects.'),
  numQuestions: z.number().describe('The number of questions to generate for this batch.'),
  existingQuestions: z.array(z.string()).optional().describe('A list of questions already generated, to avoid duplicates.'),
  apiKey: z.string().optional().describe('Optional Gemini API key.'),
});
export type GenerateHellBoundQuizInput = z.infer<typeof GenerateHellBoundQuizInputSchema>;

// This schema is for the prompt itself, excluding the API key.
const GenerateHellBoundQuizPromptInputSchema = GenerateHellBoundQuizInputSchema.omit({ apiKey: true });

const MultipleChoiceQuestionSchema = z.object({
  questionType: z.enum(['multipleChoice']).describe("The type of the question."),
  question: z.string().describe('The question text. All mathematical notation MUST be properly formatted in LaTeX and enclosed in single ($...$) or double ($$...$$) dollar signs for rendering.'),
  options: z.array(z.string().describe('A multiple-choice option. All mathematical notation MUST be properly formatted in LaTeX and enclosed in single ($...$) or double ($$...$$) dollar signs.')).length(4).describe('An array of 4 multiple-choice options.'),
  answer: z.string().describe('The correct answer, which must be one of the provided options. All mathematical notation MUST be properly formatted in LaTeX and enclosed in single ($...$) or double ($$...$$) dollar signs.'),
});

const OpenEndedQuestionSchema = z.object({
  questionType: z.enum(['openEnded']).describe("The type of the question."),
  question: z.string().describe('The problem-solving or open-ended question. All mathematical notation MUST be properly formatted in LaTeX and enclosed in single ($...$) or double ($$...$$) dollar signs for rendering.'),
  answer: z.string().describe('The detailed, correct solution to the problem. All mathematical notation MUST be properly formatted in LaTeX and enclosed in single ($...$) or double ($$...$$) dollar signs.'),
});

const QuestionSchema = z.union([MultipleChoiceQuestionSchema, OpenEndedQuestionSchema]);


const GenerateHellBoundQuizOutputSchema = z.object({
  quiz: z.object({
      questions: z.array(QuestionSchema).refine(items => items.every(item => item.question.trim() !== ''), {
        message: 'Question text cannot be empty.',
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
  async (input) => {
    const quizPromptTemplate = `You are an AI assistant with a "HELL BOUND" persona. Your task is to create an exceptionally difficult, soul-crushing quiz from the provided content. This is not a test of basic knowledge; it is a trial by fire designed to challenge the user's deepest understanding and push their cognitive limits.

**Core Material:**
{{{fileContent}}}

**Diabolical Instructions:**
1.  **Embrace Complexity:** Generate exactly {{numQuestions}} questions that are intricate, multi-layered, and require profound, non-obvious connections to be made from the source material. Ask "why" and "how," not just "what."
2.  **Forge Deceptive Options (for Multiple Choice):** Create plausible but subtly incorrect distractors that prey on common misconceptions. The correct answer should be a needle in a haystack of intellectual traps.
3.  **Demand Rigorous Solutions (for Open-Ended):** Problems should require detailed, step-by-step reasoning. The expected answer is not just a fact, but a full-fledged, logically sound argument or derivation.
4.  **Avoid Redundancy:** The torments you inflict must be unique. Do not repeat questions from this list of prior sins: {{#if existingQuestions}}{{{json existingQuestions}}}{{else}}None{{/if}}.
5.  **Impeccable LaTeX:** All mathematical notation must be flawlessly formatted in LaTeX. Single dollar signs ($...$) for inline, double ($$...$$) for display. No exceptions. This is the sacred script of this hell.

**Output Mandate:**
You WILL provide your response in the specified JSON format. Failure is not an option.
{{jsonSchema}}`;
    
    const summarizePromptTemplate = `You are a text summarization AI with a "HELL BOUND" persona. The following content is too vast to be processed in its raw form. Your task is to distill this chaos into a concentrated elixir of pure, high-level concepts. Do not summarize the simple facts; extract the most complex, abstract, and interconnectable ideas. Find the hidden relationships and the most challenging principles that a lesser mind would overlook. This summary will be used to forge the most difficult questions imaginable.

**Raw Material:**
{{{fileContent}}}

**Distilled Essence:**`;

    const {apiKey, ...promptInput} = input;
    const runner = apiKey
      ? genkit({
          plugins: [googleAI({apiKey})],
          model: 'googleai/gemini-2.0-flash',
        })
      : ai;

    const CONTENT_THRESHOLD = 20000;
    let processedContent = input.fileContent;

    if (processedContent.length > CONTENT_THRESHOLD) {
      const { text } = await runner.generate({
        prompt: summarizePromptTemplate.replace('{{{fileContent}}}', processedContent),
      });
      processedContent = text;
    }

    const prompt = runner.definePrompt({
      name: 'generateHellBoundQuizPrompt',
      input: {schema: GenerateHellBoundQuizPromptInputSchema},
      output: {schema: GenerateHellBoundQuizOutputSchema},
      prompt: quizPromptTemplate,
    });


    const {output} = await prompt({...promptInput, fileContent: processedContent});
    return output!;
  }
);
