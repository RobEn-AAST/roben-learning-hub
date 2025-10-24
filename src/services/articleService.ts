import { createClient } from '@/lib/supabase/client';
import { createClient as createServerClient } from '@/lib/supabase/server';

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

  // Helper method to get appropriate client based on user role
  private async getClientForRole(clientType?: 'admin' | 'regular'): Promise<any> {
    const serverClient = await createServerClient();
    
    if (clientType === 'admin') {
      console.log('🔧 ArticleService - Using admin client type');
      // For admin, we could potentially use service role, but for now use same client
      // The difference will be made at the API level where we check permissions
      return serverClient;
    } else {
      console.log('🔧 ArticleService - Using regular client type (will respect RLS)');
      // For instructors, the server client should respect RLS because user session is maintained
      return serverClient;
    }
  }

  async getArticleStats(clientType?: 'admin' | 'regular'): Promise<ArticleStats> {
    try {
      const supabaseClient = await this.getClientForRole(clientType);
      console.log('📊 ArticleService.getArticleStats - Using client type:', clientType || 'default');

      // Get all articles data
      const { data: articlesData, error: articlesError } = await supabaseClient
        .from('articles')
        .select('reading_time_minutes, summary, lesson_id');

      if (articlesError) {
        console.error('❌ ArticleService.getArticleStats - Error:', articlesError);
        throw articlesError;
      }

      const totalArticles = articlesData?.length || 0;
      const totalReadingTimeMinutes = articlesData?.reduce((sum: number, article: any) => sum + (article.reading_time_minutes || 0), 0) || 0;
      const totalReadingTimeHours = Math.round((totalReadingTimeMinutes / 60) * 100) / 100;

      const articlesWithSummary = articlesData?.filter((article: any) => article.summary && article.summary.trim().length > 0).length || 0;
      const averageReadingTime = totalArticles > 0 ? Math.round((totalReadingTimeMinutes / totalArticles) * 100) / 100 : 0;

      // Group by lesson
      const articlesByLesson = articlesData?.reduce((acc: Record<string, number>, article: any) => {
        acc[article.lesson_id] = (acc[article.lesson_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      console.log('✅ ArticleService.getArticleStats - Retrieved stats for', totalArticles, 'articles');
      return {
        total_articles: totalArticles,
        total_reading_time_hours: totalReadingTimeHours,
        articles_with_summary: articlesWithSummary,
        average_reading_time: averageReadingTime,
        articles_by_lesson: articlesByLesson
      };
    } catch (error) {
      console.error('❌ ArticleService.getArticleStats - Error:', error);
      throw error;
    }
  }

  async getAllArticles(clientType?: 'admin' | 'regular'): Promise<Article[]> {
    try {
      const supabaseClient = await this.getClientForRole(clientType);
      console.log('📚 ArticleService.getAllArticles - Using client type:', clientType || 'default');

      // Get articles with simple query to avoid RLS issues
      const { data: articles, error } = await supabaseClient
        .from('articles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ ArticleService.getAllArticles - Articles query error:', error);
        throw new Error(`Failed to fetch articles: ${error.message}`);
      }

      if (!articles || articles.length === 0) {
        console.log('📚 ArticleService.getAllArticles - No articles found');
        return [];
      }

      console.log('📚 ArticleService.getAllArticles - Found', articles.length, 'articles');

      // Get related data separately
      const lessonIds = [...new Set(articles.map((a: any) => a.lesson_id))];
      
      // Get lessons
      const { data: lessons } = await supabaseClient
        .from('lessons')
        .select('id, title, module_id')
        .in('id', lessonIds);

      const moduleIds = [...new Set(lessons?.map((l: any) => l.module_id) || [])];
      
      // Get modules
      const { data: modules } = await supabaseClient
        .from('modules')
        .select('id, title, course_id')
        .in('id', moduleIds);

      const courseIds = [...new Set(modules?.map((m: any) => m.course_id) || [])];
      
      // Get courses
      const { data: courses } = await supabaseClient
        .from('courses')
        .select('id, title')
        .in('id', courseIds);

      // Transform articles with related data
      const transformedArticles = articles.map((article: any) => {
        const lesson = lessons?.find((l: any) => l.id === article.lesson_id);
        const moduleData = modules?.find((m: any) => m.id === lesson?.module_id);
        const course = courses?.find((c: any) => c.id === moduleData?.course_id);

        return {
          ...article,
          lesson_title: lesson?.title || '',
          module_title: moduleData?.title || '',
          course_title: course?.title || ''
        };
      });

      console.log('✅ ArticleService.getAllArticles - Successfully transformed articles with related data');
      return transformedArticles;
    } catch (error) {
      console.error('❌ ArticleService.getAllArticles - Error:', error);
      throw error;
    }
  }

  async getArticleById(id: string, clientType?: 'admin' | 'regular'): Promise<Article | null> {
    try {
      const supabaseClient = await this.getClientForRole(clientType);
      console.log('🔍 ArticleService.getArticleById - Using client type:', clientType || 'default', 'for article:', id);

      const { data, error } = await supabaseClient
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

      if (error) {
        console.error('❌ ArticleService.getArticleById - Error:', error);
        throw error;
      }

      if (!data) {
        console.log('❌ ArticleService.getArticleById - Article not found:', id);
        return null;
      }

      console.log('✅ ArticleService.getArticleById - Article found:', data.title);
      return {
        ...data,
        lesson_title: data.lessons?.title,
        module_title: data.lessons?.modules?.title,
        course_title: data.lessons?.modules?.courses?.title
      };
    } catch (error) {
      console.error('❌ ArticleService.getArticleById - Error:', error);
      throw error;
    }
  }

  async createArticle(articleData: CreateArticleData, clientType?: 'admin' | 'regular'): Promise<Article> {
    try {
      const supabaseClient = await this.getClientForRole(clientType);
      console.log('➕ ArticleService.createArticle - Using client type:', clientType || 'default');
      console.log('➕ ArticleService.createArticle - Creating article:', { lesson_id: articleData.lesson_id, title: articleData.title });

      const { data, error } = await supabaseClient
        .from('articles')
        .insert([articleData])
        .select()
        .single();

      if (error) {
        console.error('❌ ArticleService.createArticle - Error:', error);
        throw error;
      }
      
      console.log('✅ ArticleService.createArticle - Article created successfully:', data.id);
      return data;
    } catch (error) {
      console.error('❌ ArticleService.createArticle - Error:', error);
      throw error;
    }
  }

  async updateArticle(id: string, articleData: UpdateArticleData, clientType?: 'admin' | 'regular'): Promise<Article> {
    try {
      const supabaseClient = await this.getClientForRole(clientType);
      console.log('✏️ ArticleService.updateArticle - Using client type:', clientType || 'default', 'for article:', id);

      const { data, error } = await supabaseClient
        .from('articles')
        .update(articleData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ ArticleService.updateArticle - Error:', error);
        throw error;
      }
      
      console.log('✅ ArticleService.updateArticle - Article updated successfully:', data.id);
      return data;
    } catch (error) {
      console.error('❌ ArticleService.updateArticle - Error:', error);
      throw error;
    }
  }

  async deleteArticle(id: string, clientType?: 'admin' | 'regular'): Promise<void> {
    try {
      const supabaseClient = await this.getClientForRole(clientType);
      console.log('🗑️ ArticleService.deleteArticle - Using client type:', clientType || 'default', 'for article:', id);

      const { error } = await supabaseClient
        .from('articles')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ ArticleService.deleteArticle - Error:', error);
        throw error;
      }
      
      console.log('✅ ArticleService.deleteArticle - Article deleted successfully:', id);
    } catch (error) {
      console.error('❌ ArticleService.deleteArticle - Error:', error);
      throw error;
    }
  }

  async getAvailableLessons(clientType?: 'admin' | 'regular'): Promise<Lesson[]> {
    try {
      const supabaseClient = await this.getClientForRole(clientType);
      console.log('📋 ArticleService.getAvailableLessons - Using client type:', clientType || 'default');

      // First, get all article-type lessons
      const { data: lessonsData, error: lessonsError } = await supabaseClient
        .from('lessons')
        .select(`
          id,
          title,
          instructor_id,
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
        .eq('lesson_type', 'article')  // Only get article lessons
        .order('title');

      if (lessonsError) {
        console.error('❌ ArticleService.getAvailableLessons - Error fetching lessons:', lessonsError);
        throw lessonsError;
      }

      // Get all lesson IDs that already have articles
      const { data: articlesData, error: articlesError } = await supabaseClient
        .from('articles')
        .select('lesson_id');

      if (articlesError) {
        console.error('❌ ArticleService.getAvailableLessons - Error fetching articles:', articlesError);
        throw articlesError;
      }

      // Create a Set of lesson IDs that already have articles
      const usedLessonIds = new Set(articlesData?.map((article: { lesson_id: string }) => article.lesson_id) || []);
      console.log('📋 ArticleService.getAvailableLessons - Lessons with existing articles:', usedLessonIds.size);

      // Filter out lessons that already have articles
      const availableLessons = lessonsData?.filter((lesson: any) => !usedLessonIds.has(lesson.id)) || [];

      const lessons = availableLessons.map((lesson: any) => ({
        id: lesson.id,
        title: lesson.title,
        instructor_id: lesson.instructor_id,
        module_title: lesson.modules?.title,
        course_title: lesson.modules?.courses?.title,
        course_id: lesson.modules?.course_id
      }));

      console.log('✅ ArticleService.getAvailableLessons - Found', lessons.length, 'available lessons (filtered from', lessonsData?.length || 0, 'total)');
      console.log('📋 ArticleService.getAvailableLessons - Sample lessons:', lessons.slice(0, 3));
      
      return lessons;
    } catch (error) {
      console.error('❌ ArticleService.getAvailableLessons - Error:', error);
      throw error;
    }
  }

  async getArticlesByLessonId(lessonId: string, clientType?: 'admin' | 'regular'): Promise<Article[]> {
    try {
      const supabaseClient = await this.getClientForRole(clientType);
      console.log('📚 ArticleService.getArticlesByLessonId - Using client type:', clientType || 'default', 'for lesson:', lessonId);

      const { data, error } = await supabaseClient
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

      if (error) {
        console.error('❌ ArticleService.getArticlesByLessonId - Error:', error);
        throw error;
      }

      const articles = data?.map((article: any) => ({
        ...article,
        lesson_title: article.lessons?.title,
        module_title: article.lessons?.modules?.title,
        course_title: article.lessons?.modules?.courses?.title
      })) || [];

      console.log('✅ ArticleService.getArticlesByLessonId - Found', articles.length, 'articles for lesson:', lessonId);
      return articles;
    } catch (error) {
      console.error('❌ ArticleService.getArticlesByLessonId - Error:', error);
      throw error;
    }
  }

  async getLessonsForSelect(clientType?: 'admin' | 'regular'): Promise<Lesson[]> {
    try {
      const supabaseClient = await this.getClientForRole(clientType);
      console.log('📋 ArticleService.getLessonsForSelect - Using client type:', clientType || 'default');

      const { data, error } = await supabaseClient
        .from('lessons')
        .select(`
          id,
          title,
          modules(
            title,
            courses(title)
          )
        `)
        .eq('lesson_type', 'article')  // Only get article lessons
        .order('title');

      if (error) {
        console.error('❌ ArticleService.getLessonsForSelect - Error:', error);
        throw error;
      }

      const lessons = data?.map((lesson: {
        id: string;
        title: string;
        modules: {
          title: string;
          courses: { title: string }[];
        }[];
      }) => ({
        id: lesson.id,
        title: lesson.title,
        module_title: lesson.modules[0]?.title,
        course_title: lesson.modules[0]?.courses[0]?.title
      })) || [];

      console.log('✅ ArticleService.getLessonsForSelect - Found', lessons.length, 'article lessons');
      return lessons;
    } catch (error) {
      console.error('❌ ArticleService.getLessonsForSelect - Error:', error);
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
