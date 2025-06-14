import { create } from 'zustand';
import { SubjectType, GradeType, UserProgress, ProgressRecord } from '../types';
import { generateProblem } from '../utils/problemGenerator';

interface AppState {
  currentSubject: SubjectType | null;
  currentGrade: GradeType | null;
  showHint: boolean;
  currentProblem: any | null;
  userAnswer: string;
  isCorrect: boolean | null;
  userProgress: UserProgress;
  showBookCover: boolean;
  activeTab: 'main' | 'matric' | 'promptmaster' | 'playlearn';
  
  setSubject: (subject: SubjectType) => void;
  setGrade: (grade: GradeType) => void;
  toggleHint: () => void;
  generateNewProblem: () => void;
  setUserAnswer: (answer: string) => void;
  checkAnswer: () => void;
  recordProgress: (record: ProgressRecord) => void;
  hideBookCover: () => void;
  setActiveTab: (tab: 'main' | 'matric' | 'promptmaster' | 'playlearn') => void;
}

const initialProgress: UserProgress = {
  totalAttempted: 0,
  totalCorrect: 0,
  bySubject: {
    math: { totalAttempted: 0, totalCorrect: 0, byGrade: {} },
    physics: { totalAttempted: 0, totalCorrect: 0, byGrade: {} },
    science: { totalAttempted: 0, totalCorrect: 0, byGrade: {} },
    english: { totalAttempted: 0, totalCorrect: 0, byGrade: {} },
    history: { totalAttempted: 0, totalCorrect: 0, byGrade: {} },
    geography: { totalAttempted: 0, totalCorrect: 0, byGrade: {} },
    coding: { totalAttempted: 0, totalCorrect: 0, byGrade: {} },
  },
  recentAttempts: [],
};

const grades: GradeType[] = ['kindergarten', 'grade1-6', 'grade7-9', 'grade10-12', 'matric'];
Object.keys(initialProgress.bySubject).forEach(subject => {
  const subjectKey = subject as SubjectType;
  grades.forEach(grade => {
    initialProgress.bySubject[subjectKey].byGrade[grade] = {
      totalAttempted: 0,
      totalCorrect: 0,
    };
  });
});

const loadProgress = (): UserProgress => {
  const savedProgress = localStorage.getItem('eduSphereProgress');
  return savedProgress ? JSON.parse(savedProgress) : initialProgress;
};

export const useAppStore = create<AppState>((set, get) => ({
  currentSubject: null,
  currentGrade: null,
  showHint: false,
  currentProblem: null,
  userAnswer: '',
  isCorrect: null,
  userProgress: loadProgress(),
  showBookCover: true,
  activeTab: 'main',

  setSubject: (subject) => set({ currentSubject: subject }),
  setGrade: (grade) => set({ currentGrade: grade }),
  toggleHint: () => set((state) => ({ showHint: !state.showHint })),
  
  generateNewProblem: () => {
    const { currentSubject, currentGrade } = get();
    if (currentSubject && currentGrade) {
      const problem = generateProblem(currentSubject, currentGrade);
      set({ 
        currentProblem: problem, 
        userAnswer: '', 
        isCorrect: null,
        showHint: false 
      });
    }
  },
  
  setUserAnswer: (answer) => set({ userAnswer: answer }),
  
  checkAnswer: () => {
    const { currentProblem, userAnswer, currentSubject, currentGrade } = get();
    if (!currentProblem || !currentSubject || !currentGrade) return;
    
    let isCorrect = false;
    
    if (currentSubject === 'math' || currentSubject === 'physics') {
      const userNumeric = parseFloat(userAnswer);
      const correctNumeric = parseFloat(currentProblem.answer);
      isCorrect = !isNaN(userNumeric) && 
                  !isNaN(correctNumeric) && 
                  Math.abs(userNumeric - correctNumeric) < 0.01;
    } else {
      isCorrect = userAnswer.trim().toLowerCase() === currentProblem.answer.trim().toLowerCase();
    }
    
    set({ isCorrect });
    
    const record: ProgressRecord = {
      timestamp: Date.now(),
      subject: currentSubject,
      grade: currentGrade,
      correct: isCorrect,
      question: currentProblem.question,
      userAnswer: userAnswer,
      correctAnswer: currentProblem.answer,
    };
    
    get().recordProgress(record);
  },
  
  recordProgress: (record) => {
    const { userProgress } = get();
    const updatedProgress = JSON.parse(JSON.stringify(userProgress)) as UserProgress;
    
    updatedProgress.totalAttempted += 1;
    if (record.correct) updatedProgress.totalCorrect += 1;
    
    updatedProgress.bySubject[record.subject].totalAttempted += 1;
    if (record.correct) updatedProgress.bySubject[record.subject].totalCorrect += 1;
    
    updatedProgress.bySubject[record.subject].byGrade[record.grade].totalAttempted += 1;
    if (record.correct) {
      updatedProgress.bySubject[record.subject].byGrade[record.grade].totalCorrect += 1;
    }
    
    updatedProgress.recentAttempts.unshift(record);
    if (updatedProgress.recentAttempts.length > 5) {
      updatedProgress.recentAttempts = updatedProgress.recentAttempts.slice(0, 5);
    }
    
    localStorage.setItem('eduSphereProgress', JSON.stringify(updatedProgress));
    set({ userProgress: updatedProgress });
  },
  
  hideBookCover: () => set({ showBookCover: false }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));