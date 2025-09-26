

import { createClient } from '@/lib/supabase/client';

export interface Quiz {
  id: string;
  lessonId: string;
  title: string;
  description?: string;
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
  async getLessons() {
    const { data, error } = await this.supabase.from('lessons').select('id, title');
    if (error) return [];
    return data || [];
  }
  async getQuizzes() {
    const { data, error } = await this.supabase.from('quizzes').select('id, lesson_id, title, description, created_at');
    if (error) return [];
    // Map lesson_id -> lessonId, created_at -> createdAt for frontend consistency
    return (data || []).map((q: any) => ({
      ...q,
      lessonId: q.lesson_id,
      createdAt: q.created_at,
    }));
  }
  private supabase = createClient();

  async createQuiz(lessonId: string, title: string, description?: string) {
    // First check if a quiz already exists for this lesson
    const { data: existingQuiz } = await this.supabase
      .from('quizzes')
      .select('id')
      .eq('lesson_id', lessonId)
      .single();
    
    if (existingQuiz) {
      throw new Error('A quiz already exists for this lesson. Each lesson can only have one quiz.');
    }

    // Use lesson_id (snake_case) to match DB column
    const { data, error } = await this.supabase
      .from('quizzes')
      .insert([{ lesson_id: lessonId, title, description }])
      .select('id, lesson_id, title, description, created_at')
      .single();
    if (error) {
      console.error('Failed to create quiz:', error.message, error.details || '', error.hint || '');
      if (error.message.includes('duplicate key')) {
        throw new Error('A quiz already exists for this lesson. Each lesson can only have one quiz.');
      }
      throw new Error(error.message);
    }
    // Map lesson_id -> lessonId, created_at -> createdAt for frontend consistency
    return data ? {
      ...data,
      lessonId: data.lesson_id,
      createdAt: data.created_at,
    } : null;
  }
  async getQuestions() {
    const { data, error } = await this.supabase.from('questions').select('id, quiz_id, content, type');
    if (error) return [];
    // Map quiz_id -> quizId, content -> text for frontend consistency
    return (data || []).map((q: any) => ({
      ...q,
      quizId: q.quiz_id,
      text: q.content,
    }));
  }

  async getQuestionOptions() {
    const { data, error } = await this.supabase.from('question_options').select('id, question_id, content, is_correct');
    if (error) return [];
    // Map question_id -> questionId, content -> text, is_correct -> isCorrect
    return (data || []).map((o: any) => ({
      ...o,
      questionId: o.question_id,
      text: o.content,
      isCorrect: o.is_correct,
    }));
  }

  async createQuizQuestion(quizId: string, text: string, type: 'multiple_choice' | 'short_answer' | 'true_false') {
    // Only allow valid enum values
    const allowedTypes = ['multiple_choice', 'short_answer', 'true_false'];
    const safeType = allowedTypes.includes(type) ? type : 'multiple_choice';
    const { data, error } = await this.supabase
      .from('questions')
      .insert([{ quiz_id: quizId, content: text, type: safeType }])
      .select('id, quiz_id, content, type')
      .single();
    if (error) {
      console.error('Failed to create quiz question:', error.message, error.details || '', error.hint || '');
      return null;
    }
    // Map quiz_id -> quizId, content -> text for frontend consistency
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
      console.error('Failed to create question option:', error.message, error.details || '', error.hint || '');
      return null;
    }
    // Map question_id -> questionId, content -> text, is_correct -> isCorrect
    return data ? {
      ...data,
      questionId: data.question_id,
      text: data.content,
      isCorrect: data.is_correct,
    } : null;
  }

  // Add more CRUD functions as needed
}

export const quizService = new QuizService();

