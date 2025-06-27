export interface Question {
  question: string;
  answer: string;
}

export interface Quiz {
  questions: Question[];
}

export interface UserProfile {
  name: string;
  studentId: string;
}
