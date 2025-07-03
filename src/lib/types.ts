
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
