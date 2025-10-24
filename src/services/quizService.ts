import { createClient } from '@/lib/supabase/client';

export interface Quiz {
  id: string;
  lessonId: string;
  title: string;
  description?: string;
  timeLimitMinutes?: number | null;
  createdAt?: string;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  text: string;
  type: 'multiple_choice' | 'short_answer' | 'true_false';
}

export interface QuestionOption {
  id: string;
  questionId: string;
  text: string;
  isCorrect: boolean;
  createdAt?: string;
}

class QuizService {
  private supabase = createClient();

  async getLessons() {
    try {
      // First, get all quiz-type lessons with module and course info
      const { data: lessonsData, error: lessonsError } = await this.supabase
        .from('lessons')
        .select(`
          id,
          title,
          modules!inner(
            id,
            title,
            course_id,
            courses!inner(
              id,
              title
            )
          )
        `)
        .eq('lesson_type', 'quiz')
        .order('title');

      if (lessonsError) {
        console.error('❌ QuizService.getLessons - Error fetching lessons:', lessonsError);
        return [];
      }

      // Get all lesson IDs that already have quizzes
      const { data: quizzesData, error: quizzesError } = await this.supabase
        .from('quizzes')
        .select('lesson_id');

      if (quizzesError) {
        console.error('❌ QuizService.getLessons - Error fetching quizzes:', quizzesError);
        return [];
      }

      // Create a Set of lesson IDs that already have quizzes
      const usedLessonIds = new Set(quizzesData?.map((quiz: { lesson_id: string }) => quiz.lesson_id) || []);
      console.log('📋 QuizService.getLessons - Lessons with existing quizzes:', usedLessonIds.size);

      // Filter out lessons that already have quizzes
      const availableLessons = lessonsData?.filter((lesson: any) => !usedLessonIds.has(lesson.id)) || [];

      const lessons = availableLessons.map((lesson: any) => ({
        id: lesson.id,
        title: lesson.title,
        module_title: lesson.modules?.title,
        course_title: lesson.modules?.courses?.title,
        course_id: lesson.modules?.course_id
      }));

      console.log('✅ QuizService.getLessons - Found', lessons.length, 'available lessons (filtered from', lessonsData?.length || 0, 'total)');
      return lessons;
    } catch (error) {
      console.error('❌ QuizService.getLessons - Error:', error);
      return [];
    }
  }

  async getQuizzes() {
    const { data, error } = await this.supabase.from('quizzes').select('id, lesson_id, title, description, created_at');
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
    const { data, error } = await this.supabase.from('questions').select('id, quiz_id, content, type');
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
}

export const quizService = new QuizService();
