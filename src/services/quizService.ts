import { createClient } from '@/lib/supabase/client';

export interface Quiz {
  id: string;
  lessonId: string;
  title: string;
  description?: string;
  timeLimitMinutes?: number | null;
  passingScore?: number;
  metadata?: any;
  createdAt?: string;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  text: string;
  type: 'multiple_choice' | 'short_answer' | 'true_false';
  points?: number;
}

export interface QuestionOption {
  id: string;
  questionId: string;
  text: string;
  isCorrect: boolean;
  createdAt?: string;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  score: number;
  total_questions: number;
  percentage: number;
  passed: boolean;
  attempt_number: number;
  answers: Record<string, any>;
  time_taken_seconds?: number;
  completed_at: string;
}

export interface QuizSubmission {
  quiz_id: string;
  answers: Record<string, string>; // question_id -> option_id
  time_taken_seconds?: number;
}

class QuizService {
  private supabase = createClient();

  async getLessons() {
    const { data, error } = await this.supabase
      .from('lessons')
      .select('id, title')
      .eq('lesson_type', 'quiz');
    if (error) return [];
    return data || [];
  }

  async getQuizzes() {
    const { data, error } = await this.supabase.from('quizzes').select('id, lesson_id, title, description, passing_score, metadata, created_at');
    if (error) return [];
    return (data || []).map((q: any) => ({
      ...q,
      lessonId: q.lesson_id,
      createdAt: q.created_at,
    }));
  }

  async createQuiz(lessonId: string, title: string, description?: string) {
    const { data: existingQuiz } = await this.supabase
      .from('quizzes')
      .select('id')
      .eq('lesson_id', lessonId)
      .single();
    
    if (existingQuiz) {
      throw new Error('A quiz already exists for this lesson. Each lesson can only have one quiz.');
    }

    const { data, error } = await this.supabase
      .from('quizzes')
      .insert([{ lesson_id: lessonId, title, description }])
      .select('id, lesson_id, title, description, created_at')
      .single();
      
    if (error) {
      console.error('Failed to create quiz:', error.message);
      if (error.message.includes('duplicate key')) {
        throw new Error('A quiz already exists for this lesson. Each lesson can only have one quiz.');
      }
      throw new Error(error.message);
    }
    
    return data ? {
      ...data,
      lessonId: data.lesson_id,
      createdAt: data.created_at,
    } : null;
  }

  async getQuestions() {
    const { data, error } = await this.supabase.from('questions').select('id, quiz_id, content, type, points');
    if (error) return [];
    return (data || []).map((q: any) => ({
      ...q,
      quizId: q.quiz_id,
      text: q.content,
    }));
  }

  async getQuestionOptions() {
    const { data, error } = await this.supabase.from('question_options').select('id, question_id, content, is_correct');
    if (error) return [];
    return (data || []).map((o: any) => ({
      ...o,
      questionId: o.question_id,
      text: o.content,
      isCorrect: o.is_correct,
    }));
  }

  async createQuizQuestion(quizId: string, text: string, type: 'multiple_choice' | 'short_answer' | 'true_false') {
    const allowedTypes = ['multiple_choice', 'short_answer', 'true_false'];
    const safeType = allowedTypes.includes(type) ? type : 'multiple_choice';
    const { data, error } = await this.supabase
      .from('questions')
      .insert([{ quiz_id: quizId, content: text, type: safeType }])
      .select('id, quiz_id, content, type')
      .single();
    if (error) {
      console.error('Failed to create quiz question:', error.message);
      return null;
    }
    return data ? {
      ...data,
      quizId: data.quiz_id,
      text: data.content,
    } : null;
  }

  async createQuestionOption(questionId: string, text: string, isCorrect: boolean) {
    const { data, error } = await this.supabase
      .from('question_options')
      .insert([{ question_id: questionId, content: text, is_correct: isCorrect }])
      .select('id, question_id, content, is_correct')
      .single();
    if (error) {
      console.error('Failed to create question option:', error.message);
      return null;
    }
    return data ? {
      ...data,
      questionId: data.question_id,
      text: data.content,
      isCorrect: data.is_correct,
    } : null;
  }

  async getQuizWithQuestionsAndOptions(quizId: string) {
    const { data, error } = await this.supabase
      .from('quizzes')
      .select(`
        *,
        questions(
          *,
          question_options(*)
        )
      `)
      .eq('id', quizId)
      .single();

    if (error) throw error;
    return data;
  }

  async submitQuizAttempt(submission: QuizSubmission): Promise<QuizAttempt> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const quiz = await this.getQuizWithQuestionsAndOptions(submission.quiz_id);
    if (!quiz) throw new Error('Quiz not found');

    let score = 0;
    const totalQuestions = quiz.questions.length;

    for (const question of quiz.questions) {
      const selectedOptionId = submission.answers[question.id];
      const correctOption = question.question_options.find((opt: any) => opt.is_correct);
      
      if (selectedOptionId === correctOption?.id) {
        score += question.points || 1;
      }
    }

    const percentage = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;
    const passed = percentage >= (quiz.passing_score || 70);

    const { data: previousAttempts } = await this.supabase
      .from('quiz_attempts')
      .select('attempt_number')
      .eq('quiz_id', submission.quiz_id)
      .eq('user_id', user.id)
      .order('attempt_number', { ascending: false })
      .limit(1);

    const attemptNumber = (previousAttempts?.[0]?.attempt_number || 0) + 1;

    const { data: attempt, error } = await this.supabase
      .from('quiz_attempts')
      .insert({
        quiz_id: submission.quiz_id,
        user_id: user.id,
        score,
        total_questions: totalQuestions,
        percentage,
        passed,
        attempt_number: attemptNumber,
        answers: submission.answers,
        time_taken_seconds: submission.time_taken_seconds
      })
      .select()
      .single();

    if (error) throw error;
    return attempt;
  }

  async getQuizAttempts(quizId: string): Promise<QuizAttempt[]> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await this.supabase
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('user_id', user.id)
      .order('attempt_number', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getLatestAttempt(quizId: string): Promise<QuizAttempt | null> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await this.supabase
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('user_id', user.id)
      .order('attempt_number', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  async canRetakeQuiz(quizId: string): Promise<{ canRetake: boolean; currentAttempts: number; maxAttempts: number }> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get quiz metadata for max attempts
    const { data: quiz } = await this.supabase
      .from('quizzes')
      .select('metadata')
      .eq('id', quizId)
      .single();

    const maxAttempts = quiz?.metadata?.attempts_allowed || 3;

    // Get current attempts count
    const { data: attempts, error } = await this.supabase
      .from('quiz_attempts')
      .select('attempt_number, passed')
      .eq('quiz_id', quizId)
      .eq('user_id', user.id)
      .order('attempt_number', { ascending: false });

    if (error) throw error;

    const currentAttempts = attempts?.length || 0;
    const hasPassedQuiz = attempts?.some(attempt => attempt.passed) || false;

    // Can retake if: not passed yet AND attempts remaining
    const canRetake = !hasPassedQuiz && currentAttempts < maxAttempts;

    return {
      canRetake,
      currentAttempts,
      maxAttempts
    };
  }
}

export const quizService = new QuizService();
