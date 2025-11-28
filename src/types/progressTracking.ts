// ============================================================================
// TYPES FOR STUDENT PROGRESS TRACKING
// ============================================================================

export interface StudentProgress {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  enrolledAt: string;
  progress: {
    completedLessons: number;
    totalLessons: number;
    percentage: number;
  };
  quizStats: {
    totalAttempts: number;
    averageScore: number | null;
    passedQuizzes: number;
  };
  quizScores: QuizAttempt[];
  recentActivity: StudentRecentActivity[];
}

export interface QuizAttempt {
  quizId: string;
  quizTitle: string;
  lessonTitle: string;
  score: number | null;
  earnedPoints: number | null;
  totalPoints: number | null;
  passed: boolean | null;
  completedAt: string | null;
  startedAt: string;
}

export interface StudentRecentActivity {
  lessonId: string;
  lessonTitle: string;
  completedAt: string;
}

export interface StudentCourseStats {
  totalLessons: number;
  averageProgress: number;
  studentsCompleted: number;
}

export interface StudentProgressData {
  course: {
    id: string;
    title: string;
  };
  students: StudentProgress[];
  totalStudents: number;
  courseStats: StudentCourseStats;
}
