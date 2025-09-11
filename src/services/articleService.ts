import { createClient } from '@/lib/supabase/client';

export interface Article {
  id: string;
  lesson_id: string;
  title: string;
  content: string;
  summary?: string;
  reading_time_minutes: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Join fields
  lesson_title?: string;
  module_title?: string;
  course_title?: string;
}

export interface CreateArticleData {
  lesson_id: string;
  title: string;
  content: string;
  summary?: string;
  reading_time_minutes: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateArticleData {
  lesson_id?: string;
  title?: string;
  content?: string;
  summary?: string;
  reading_time_minutes?: number;
  metadata?: Record<string, unknown>;
}

export interface ArticleStats {
  total_articles: number;
  total_reading_time_hours: number;
  articles_with_summary: number;
  average_reading_time: number;
  articles_by_lesson: Record<string, number>;
}

export interface Lesson {
  id: string;
  title: string;
  module_title?: string;
  course_title?: string;
}

class ArticleService {
  private supabase = createClient();

  async getArticleStats(): Promise<ArticleStats> {
    try {
      // Get all articles data
      const { data: articlesData, error: articlesError } = await this.supabase
        .from('articles')
        .select('reading_time_minutes, summary, lesson_id');

      if (articlesError) throw articlesError;

      const totalArticles = articlesData?.length || 0;
      const totalReadingTimeMinutes = articlesData?.reduce((sum, article) => sum + (article.reading_time_minutes || 0), 0) || 0;
      const totalReadingTimeHours = Math.round((totalReadingTimeMinutes / 60) * 100) / 100;

      const articlesWithSummary = articlesData?.filter(article => article.summary && article.summary.trim().length > 0).length || 0;
      const averageReadingTime = totalArticles > 0 ? Math.round((totalReadingTimeMinutes / totalArticles) * 100) / 100 : 0;

      // Group by lesson
      const articlesByLesson = articlesData?.reduce((acc, article) => {
        acc[article.lesson_id] = (acc[article.lesson_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      return {
        total_articles: totalArticles,
        total_reading_time_hours: totalReadingTimeHours,
        articles_with_summary: articlesWithSummary,
        average_reading_time: averageReadingTime,
        articles_by_lesson: articlesByLesson
      };
    } catch (error) {
      console.error('Error getting article stats:', error);
      throw error;
    }
  }

  async getAllArticles(): Promise<Article[]> {
    try {
      const { data, error } = await this.supabase
        .from('articles')
        .select(`
          *,
          lessons!inner(
            title,
            modules!inner(
              title,
              courses!inner(title)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(article => ({
        ...article,
        lesson_title: article.lessons?.title,
        module_title: article.lessons?.modules?.title,
        course_title: article.lessons?.modules?.courses?.title
      })) || [];
    } catch (error) {
      console.error('Error fetching articles:', error);
      throw error;
    }
  }

  async getArticleById(id: string): Promise<Article | null> {
    try {
      const { data, error } = await this.supabase
        .from('articles')
        .select(`
          *,
          lessons!inner(
            title,
            modules!inner(
              title,
              courses!inner(title)
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      if (!data) return null;

      return {
        ...data,
        lesson_title: data.lessons?.title,
        module_title: data.lessons?.modules?.title,
        course_title: data.lessons?.modules?.courses?.title
      };
    } catch (error) {
      console.error('Error fetching article:', error);
      throw error;
    }
  }

  async createArticle(articleData: CreateArticleData): Promise<Article> {
    try {
      const { data, error } = await this.supabase
        .from('articles')
        .insert([articleData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating article:', error);
      throw error;
    }
  }

  async updateArticle(id: string, articleData: UpdateArticleData): Promise<Article> {
    try {
      const { data, error } = await this.supabase
        .from('articles')
        .update(articleData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating article:', error);
      throw error;
    }
  }

  async deleteArticle(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('articles')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting article:', error);
      throw error;
    }
  }

  async getAvailableLessons(): Promise<Lesson[]> {
    try {
      const { data, error } = await this.supabase
        .from('lessons')
        .select(`
          id,
          title,
          modules!inner(
            title,
            courses!inner(title)
          )
        `)
        .order('title');

      if (error) throw error;

      return data?.map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        module_title: (lesson as any).modules?.title,
        course_title: (lesson as any).modules?.courses?.title
      })) || [];
    } catch (error) {
      console.error('Error fetching lessons:', error);
      throw error;
    }
  }

  async getArticlesByLessonId(lessonId: string): Promise<Article[]> {
    try {
      const { data, error } = await this.supabase
        .from('articles')
        .select(`
          *,
          lessons!inner(
            title,
            modules!inner(
              title,
              courses!inner(title)
            )
          )
        `)
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(article => ({
        ...article,
        lesson_title: article.lessons?.title,
        module_title: article.lessons?.modules?.title,
        course_title: article.lessons?.modules?.courses?.title
      })) || [];
    } catch (error) {
      console.error('Error fetching articles for lesson:', error);
      throw error;
    }
  }

  // Helper method to estimate reading time based on content
  static estimateReadingTime(content: string): number {
    const wordsPerMinute = 200; // Average reading speed
    const words = content.trim().split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  }

  // Helper method to generate summary from content
  static generateSummary(content: string, maxLength: number = 200): string {
    const cleanContent = content.replace(/<[^>]*>/g, '').trim(); // Remove HTML tags
    if (cleanContent.length <= maxLength) return cleanContent;
    
    const truncated = cleanContent.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
  }
}

export const articleService = new ArticleService();
export { ArticleService };
