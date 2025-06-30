
export type MultipleChoiceQuestion = {
  questionType: 'multipleChoice';
  question: string;
  options: string[];
  answer: string;
};

export type OpenEndedQuestion = {
  questionType: 'openEnded';
  question: string;
  answer: string; // This is the solution
};

export type Question = MultipleChoiceQuestion | OpenEndedQuestion;


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
  score: {
    score: number;
    total: number;
    percentage: number;
  };
  color?: string;
}
