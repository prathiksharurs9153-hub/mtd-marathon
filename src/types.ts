export interface QuizQuestion {
  question_id: number;
  question_text: string;
  options: string[];
  correct_answer: string;
  timer_seconds: number;
  type: "radio" | "checkbox";
  explanation?: string;
}

export interface StudentData {
  name: string;
  usn: string;
  email?: string;
  department?: string;
}

export interface Participant {
  usn: string;
  name?: string;
  department?: string;
  score?: number;
  total?: number;
  percentage?: number;
  status?: "Joined" | "In-Progress" | "Completed";
  joinedAt?: number;
  answers?: Record<string, string | string[]>;
}

export interface QuizMeta {
  quizId: string;
  title: string;
  questionCount: number;
  status: "idle" | "running" | "completed";
  isCompleted: boolean;
  totalDurationSeconds: number;
}

export interface SyncQuestionPayload {
  type: "host_question_sync";
  question_text: string;
  timer_seconds: number;
  index: number;
  total: number;
  question_id?: number;
  type_choice?: "radio" | "checkbox";
  explanation?: string;
}

export interface LeaderboardEntry {
  student: StudentData;
  score: number;
  total: number;
  percentage: number;
  answers: Record<string, string | string[]>;
  status?: string;
}
