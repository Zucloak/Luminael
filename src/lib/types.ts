export interface Question {
  question: string;
  options: string[];
  answer: string;
}

export interface Quiz {
  questions: Question[];
}

export interface UserProfile {
  name: string;
  studentId: string;
}
