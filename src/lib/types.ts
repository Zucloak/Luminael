
export type MultipleChoiceQuestion = {
  questionType: 'multipleChoice';
  question: string;
  options: string[];
  answer: string;
};

export type ProblemSolvingQuestion = {
  questionType: 'problemSolving';
  question: string; // Calculative, step-by-step, numeric or symbolic
  answer: string; // Detailed, step-by-step solution
  hadProblemSpecificOcrText?: boolean; // Flag if OCR'd text from a specific image was used
};

export type OpenEndedQuestion = {
  questionType: 'openEnded';
  question: string; // Theoretical, opinion-based, or conceptual
  answer: string; // Expected answer/discussion points
};

export type Question = MultipleChoiceQuestion | ProblemSolvingQuestion | OpenEndedQuestion;


export interface Quiz {
  questions: Question[];
}

export interface UserProfile {
  name: string;
  studentId: string;
  utilityToolsEnabled?: boolean;
}

export interface PastQuiz {
  id: number; // Using timestamp as ID
  title: string;
  date: string;
  quiz: Quiz;
  userAnswers: Record<number, string>;
  sourceContent: string;
  status: 'completed' | 'in-progress';
  score?: {
    score: number;
    total: number;
    percentage: number;
  };
  color?: string;
}

// Schemas and types for LaTeX analysis flow
// Moved from analyzeForLaTeX.ts to comply with 'use server' constraints

import { z } from 'zod'; // Make sure zod is imported here

export const AnalyzeForLaTeXInputSchema = z.object({
  content: z.string().describe('The text content to be analyzed for LaTeX or mathematical expressions.'),
  apiKey: z.string().optional().describe('Optional Gemini API key.'),
});
export type AnalyzeForLaTeXInput = z.infer<typeof AnalyzeForLaTeXInputSchema>;

export const AnalyzeForLaTeXOutputSchema = z.object({
  hasLaTeXContent: z.boolean().describe('True if LaTeX or mathematical content is detected, false otherwise.'),
});
export type AnalyzeForLaTeXOutput = z.infer<typeof AnalyzeForLaTeXOutputSchema>;

// Schemas and types for Quiz Generation (moved from generate-quiz.ts)

// Note: The core Question types (MultipleChoiceQuestion, ProblemSolvingQuestion, OpenEndedQuestion, Question)
// are already defined above. These Zod schemas provide runtime validation and AI-facing descriptions.
// We should ensure they align with the existing TypeScript types or replace them if Zod is preferred as SoT.
// For now, we'll add them and the AI flow will use these Zod definitions.

export const GenerateQuizInputSchema = z.object({
  context: z.string().describe("A structured Markdown string containing key concepts from one or more documents."),
  numQuestions: z.number().describe('The number of questions to generate for this batch.'),
  difficulty: z.string().describe('The difficulty level of the quiz.'),
  questionFormat: z.enum(['multipleChoice', 'problemSolving', 'openEnded', 'mixed']).describe("The desired format for the quiz questions."),
  existingQuestions: z.array(z.string()).optional().describe('A list of questions already generated, to avoid duplicates.'),
  apiKey: z.string().optional().describe('Optional Gemini API key.'),
  problemSpecificOcrText: z.string().optional().describe("Optional OCR'd text extracted from an image that was uploaded by the user specifically as context for a problem-solving question.")
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

export const MultipleChoiceQuestionSchema = z.object({
  questionType: z.enum(['multipleChoice']).describe("The type of the question."),
  question: z.string().describe('The question text, derived ONLY from the provided material and in the same language. All mathematical notation MUST be properly formatted in LaTeX and enclosed in single ($...$) or double ($$...$$) dollar signs for rendering.'),
  options: z.array(z.string().describe('A multiple-choice option, derived ONLY from the provided material and in the same language. All mathematical notation MUST be properly formatted in LaTeX and enclosed in single ($...$) or double ($$...$$) dollar signs.')).length(4).describe('An array of 4 multiple-choice options.'),
  answer: z.string().describe('The correct answer, which must be one of the provided options, derived ONLY from the provided material and in the same language. All mathematical notation MUST be properly formatted in LaTeX and enclosed in single ($...$) or double ($$...$$) dollar signs.'),
});

export const ProblemSolvingQuestionSchema = z.object({
  questionType: z.enum(['problemSolving']).describe("The type of the question: calculative, step-by-step, numeric or symbolic problem."),
  question: z.string().describe('The problem statement, derived ONLY from the provided material and in the same language. All mathematical notation MUST be properly formatted in LaTeX and enclosed in single ($...$) or double ($$...$$) dollar signs for rendering.'),
  answer: z.string().describe('The detailed, step-by-step solution, resulting in a numeric or symbolic answer (often boxed). Derived ONLY from the provided material and in the same language. All mathematical notation MUST be properly formatted in LaTeX and enclosed in single ($...$) or double ($$...$$) dollar signs.'),
});

export const OpenEndedQuestionSchema = z.object({
  questionType: z.enum(['openEnded']).describe("The type of the question: theoretical, opinion-based, or conceptual."),
  question: z.string().describe('The open-ended question, derived ONLY from the provided material and in the same language. All mathematical notation MUST be properly formatted in LaTeX and enclosed in single ($...$) or double ($$...$$) dollar signs for rendering.'),
  answer: z.string().describe('The expected answer or key discussion points for the open-ended question. Derived ONLY from the provided material and in the same language. All mathematical notation MUST be properly formatted in LaTeX and enclosed in single ($...$) or double ($$...$$) dollar signs.'),
});

export const QuestionSchema = z.union([MultipleChoiceQuestionSchema, ProblemSolvingQuestionSchema, OpenEndedQuestionSchema]);

export const GenerateQuizOutputSchema = z.object({
  quiz: z.object({
      questions: z.array(QuestionSchema).refine(items => items.every(item => item.question.trim() !== '' && !item.question.toLowerCase().includes("lorem ipsum")), {
        message: 'Question text cannot be empty or placeholder text.',
      }),
  }).describe('The generated quiz.'),
});
export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;

// Schemas and types for Hell Bound Quiz Generation (moved from generate-hell-bound-quiz.ts)
export const GenerateHellBoundQuizInputSchema = z.object({
  context: z.string().describe("A structured Markdown string containing key concepts from one or more documents."),
  numQuestions: z.number().describe('The number of questions to generate for this batch.'),
  existingQuestions: z.array(z.string()).optional().describe('A list of questions already generated, to avoid duplicates.'),
  apiKey: z.string().optional().describe('Optional Gemini API key.'),
});
export type GenerateHellBoundQuizInput = z.infer<typeof GenerateHellBoundQuizInputSchema>;

// GenerateHellBoundQuizOutputSchema reuses GenerateQuizOutputSchema as the structure is identical
// We can alias it or just use GenerateQuizOutputSchema directly in the flow.
// For clarity, let's alias it if we want a distinct type name, though its structure is the same.
// However, the Genkit flow definition in generate-hell-bound-quiz.ts specifically uses
// GenerateHellBoundQuizOutputSchema. So we should define it, even if it's structurally identical
// to GenerateQuizOutputSchema for now.
// The question schemas (MultipleChoiceQuestionSchema, etc.) are already defined above from generate-quiz.ts.
export const GenerateHellBoundQuizOutputSchema = GenerateQuizOutputSchema; //This might be too simple if they diverge.
// Let's define it explicitly to match the existing code, even if it's a copy for now.
// export const GenerateHellBoundQuizOutputSchema = z.object({
//   quiz: z.object({
//       questions: z.array(QuestionSchema).refine(items => items.every(item => item.question.trim() !== '' && !item.question.toLowerCase().includes("lorem ipsum")), {
//         message: 'Question text cannot be empty or placeholder text.',
//       }),
//   }).describe('The generated quiz.'),
// });
// Using the existing GenerateQuizOutputSchema is fine as they are identical.
// The flow will import GenerateQuizOutputSchema and use it.
// We need to export GenerateHellBoundQuizOutput type for the function signature.
export type GenerateHellBoundQuizOutput = GenerateQuizOutput; // Use existing GenerateQuizOutput type

// Data structure for local device data export/import
export const USER_DEVICE_DATA_VERSION = 1;

export interface UserDeviceData {
  dataVersion: typeof USER_DEVICE_DATA_VERSION;
  userProfile: UserProfile | null;
  pastQuizzes: PastQuiz[];
}

// Data structures for analytics
export interface QuizCountDataPoint {
  date: string; // e.g., "YYYY-Www" for year-week or "YYYY-MM" for year-month
  count: number;
}

export interface AverageScoreDataPoint {
  date: string; // e.g., "YYYY-Www" for year-week or "YYYY-MM" for year-month
  averageScore: number | null; // Null if no quizzes with scores in this period
  quizCountWithScores: number; // Number of quizzes that contributed to this average
}

export interface QuizAnalyticsData {
  quizCountsPerWeek: QuizCountDataPoint[];
  averageScoresPerWeek: AverageScoreDataPoint[];
  // We can extend this with monthly data or other aggregations later if needed
}
