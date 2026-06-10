export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  walletBalance: number;
  isSuspended: boolean;
  createdAt: string;
}

export interface Question {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  subject: string;
  topic: string;
  marks: number;
  explanation?: string;
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  level: 'Primary School' | 'Junior Secondary School' | 'Senior Secondary School';
  duration: number; // in minutes
  totalMarks: number;
  instructions: string;
  questions: Question[];
  creatorId: string;
  creatorName: string;
  examLink: string;
  isPublished: boolean;
  createdAt: string;
}

export interface FailedQuestionReview {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  selectedAnswer: 'A' | 'B' | 'C' | 'D' | null;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
}

export interface ExamResult {
  id: string;
  examId: string;
  examTitle: string;
  subject: string;
  studentId: string;
  studentName: string;
  score: number;
  percentage: number;
  totalQuestions: number;
  correctAnswers: number;
  failedQuestions: FailedQuestionReview[];
  date: string;
}

export interface LessonPlanSection {
  lessonObjectives: string[];
  instructionalMaterials: string[];
  behaviouralObjectives: string[];
  entryBehaviour: string;
  previousKnowledge: string;
  introduction: string;
  presentationSteps: {
    step: string;
    teachersActivities: string;
    studentsActivities: string;
    learningPoints: string;
    evaluationQuestions?: string;
  }[];
  summary: string;
  evaluation: string;
  assignment: string;
  learningOutcomes: string[];
}

export interface LessonPlan {
  id: string;
  teacherId: string;
  schoolName: string;
  teacherName: string;
  classLevel: string;
  subject: string;
  topic: string;
  subTopic: string;
  date: string;
  duration: string;
  ageOfPupils: string;
  numberOfPupils: string;
  plan: LessonPlanSection;
  createdAt: string;
}

export interface LessonNote {
  id: string;
  teacherId: string;
  subject: string;
  classLevel: string;
  topic: string;
  subTopic: string;
  periods: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  content: {
    detailedNote: string;
    explanation: string;
    examples: string[];
    classActivities: string[];
    evaluation: string[];
    assignment: string;
    summary: string;
  };
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  type: 'credit' | 'debit';
  purpose: string;
  date: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  date: string;
}

export interface AppStatistics {
  studentCount: number;
  teacherCount: number;
  examCount: number;
  questionCount: number;
  resultCount: number;
  totalPayments: number;
}

export interface WeeklySchemeUnit {
  week: number;
  topic: string;
  subtopic: string;
  objectives: string;
  teachingActivities: string;
  studentActivities: string;
  assessment: string;
  notes: string;
  homework: string;
  isTaught?: boolean;
  taughtDate?: string;
  teacherNote?: string;
}

export interface SchemeOfWork {
  id: string;
  classLevel: string;
  subject: string;
  term: "First Term" | "Second Term" | "Third Term";
  weeks: WeeklySchemeUnit[];
  updatedAt?: string;
}

