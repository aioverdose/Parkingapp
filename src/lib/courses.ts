export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  content: string;
  quiz_questions: QuizQuestion[];
  points: number;
  required: boolean;
  created_at: string;
}

export interface UserCourseProgress {
  id: string;
  user_id: string;
  course_id: string;
  status: "not_started" | "in_progress" | "passed" | "failed";
  attempts: number;
  score: number | null;
  completed_at: string | null;
  created_at: string;
}

export function scoreQuiz(
  questions: QuizQuestion[],
  answers: number[],
): { score: number; total: number; percentage: number; passed: boolean } {
  const total = questions.length;
  let correct = 0;
  for (let i = 0; i < total; i++) {
    if (answers[i] === questions[i].correct) {
      correct++;
    }
  }
  const percentage = Math.round((correct / total) * 100);
  return {
    score: correct,
    total,
    percentage,
    passed: percentage >= 80,
  };
}
