export type SubjectType = 
  | 'math' 
  | 'physics' 
  | 'science' 
  | 'english' 
  | 'history' 
  | 'geography' 
  | 'coding';

export type GradeType = 
  | 'kindergarten' 
  | 'grade1-6' 
  | 'grade7-9' 
  | 'grade10-12' 
  | 'matric';

export interface Problem {
  id: string;
  question: string;
  answer: string;
  options?: string[];
  hint?: string;
}

export interface ProgressRecord {
  timestamp: number;
  subject: SubjectType;
  grade: GradeType;
  correct: boolean;
  question: string;
  userAnswer: string;
  correctAnswer: string;
}

export interface UserProgress {
  totalAttempted: number;
  totalCorrect: number;
  bySubject: Record<SubjectType, {
    totalAttempted: number;
    totalCorrect: number;
    byGrade: Record<GradeType, {
      totalAttempted: number;
      totalCorrect: number;
    }>
  }>;
  recentAttempts: ProgressRecord[];
}