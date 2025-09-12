import { createClient } from '@/lib/supabase/client';

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  lesson_type: 'video' | 'article' | 'project' | 'quiz';
  position: number;
  status: 'draft' | 'published' | 'archived';
  instructor_id: string;
  metadata: any;
  created_at: string;
  updated_at: string;
  // Related data
  module?: {
    id: string;
    title: string;
    course_id: string;
    courses?: {
      id: string;
      title: string;
    };
  };
  instructor?: {
    id: string;
    full_name: string;
  };
  // Content counts
  videos_count?: number;
  articles_count?: number;
  projects_count?: number;
  quizzes_count?: number;
}

export interface LessonCreateData {
  module_id: string;
  title: string;
  lesson_type: 'video' | 'article' | 'project' | 'quiz';
  position?: number;
  status?: 'draft' | 'published' | 'archived';
  instructor_id: string;
  metadata?: any;
}

export interface LessonUpdateData {
  title?: string;
  lesson_type?: 'video' | 'article' | 'project' | 'quiz';
  position?: number;
  status?: 'draft' | 'published' | 'archived';
  instructor_id?: string;
  metadata?: any;
}

export interface LessonStats {
  totalLessons: number;
  publishedLessons: number;
  draftLessons: number;
  videoLessons: number;
  articleLessons: number;
  projectLessons: number;
  quizLessons: number;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  description: string;
  position: number;
  courses?: {
    id: string;
    title: string;
  };
}

const supabase = createClient();

export const lessonService = {
  // Get all lessons with pagination and filtering
  async getLessons(page = 1, limit = 10, filters?: {
    module_id?: string;
    course_id?: string;
    lesson_type?: string;
    status?: string;
  }) {
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('lessons')
      .select(`
        *,
        modules!inner(
          id,
          title,
          course_id,
          courses!inner(
            id,
            title
          )
        ),
        profiles!lessons_instructor_id_fkey(
          id,
          full_name
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.module_id) {
      query = query.eq('module_id', filters.module_id);
    }
    if (filters?.course_id) {
      query = query.eq('modules.course_id', filters.course_id);
    }
    if (filters?.lesson_type) {
      query = query.eq('lesson_type', filters.lesson_type);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    // Transform data to include proper nesting
    const transformedData = await Promise.all((data || []).map(async (lesson: any) => {
      // Get content counts
      const [videosCount, articlesCount, projectsCount, quizzesCount] = await Promise.all([
        supabase.from('videos').select('id', { count: 'exact' }).eq('lesson_id', lesson.id),
        supabase.from('articles').select('id', { count: 'exact' }).eq('lesson_id', lesson.id),
        supabase.from('projects').select('id', { count: 'exact' }).eq('lesson_id', lesson.id),
        supabase.from('quizzes').select('id', { count: 'exact' }).eq('lesson_id', lesson.id)
      ]);

      return {
        ...lesson,
        module: lesson.modules,
        instructor: lesson.profiles,
        videos_count: videosCount.count || 0,
        articles_count: articlesCount.count || 0,
        projects_count: projectsCount.count || 0,
        quizzes_count: quizzesCount.count || 0
      };
    }));

    return { lessons: transformedData, total: count || 0 };
  },

  // Get lesson statistics
  async getLessonStats(): Promise<LessonStats> {
    const [
      totalResult,
      publishedResult,
      draftResult,
      videoResult,
      articleResult,
      projectResult,
      quizResult
    ] = await Promise.all([
      supabase.from('lessons').select('id', { count: 'exact' }),
      supabase.from('lessons').select('id', { count: 'exact' }).eq('status', 'published'),
      supabase.from('lessons').select('id', { count: 'exact' }).eq('status', 'draft'),
      supabase.from('lessons').select('id', { count: 'exact' }).eq('lesson_type', 'video'),
      supabase.from('lessons').select('id', { count: 'exact' }).eq('lesson_type', 'article'),
      supabase.from('lessons').select('id', { count: 'exact' }).eq('lesson_type', 'project'),
      supabase.from('lessons').select('id', { count: 'exact' }).eq('lesson_type', 'quiz')
    ]);

    return {
      totalLessons: totalResult.count || 0,
      publishedLessons: publishedResult.count || 0,
      draftLessons: draftResult.count || 0,
      videoLessons: videoResult.count || 0,
      articleLessons: articleResult.count || 0,
      projectLessons: projectResult.count || 0,
      quizLessons: quizResult.count || 0
    };
  },

  // Get single lesson by ID
  async getLessonById(id: string): Promise<Lesson | null> {
    const { data, error } = await supabase
      .from('lessons')
      .select(`
        *,
        modules!inner(
          id,
          title,
          course_id,
          courses!inner(
            id,
            title
          )
        ),
        profiles!lessons_instructor_id_fkey(
          id,
          full_name
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) return null;

    // Get content counts
    const [videosCount, articlesCount, projectsCount, quizzesCount] = await Promise.all([
      supabase.from('videos').select('id', { count: 'exact' }).eq('lesson_id', id),
      supabase.from('articles').select('id', { count: 'exact' }).eq('lesson_id', id),
      supabase.from('projects').select('id', { count: 'exact' }).eq('lesson_id', id),
      supabase.from('quizzes').select('id', { count: 'exact' }).eq('lesson_id', id)
    ]);

    return {
      ...data,
      module: data.modules,
      instructor: data.profiles,
      videos_count: videosCount.count || 0,
      articles_count: articlesCount.count || 0,
      projects_count: projectsCount.count || 0,
      quizzes_count: quizzesCount.count || 0
    };
  },

  // Create new lesson
  async createLesson(lessonData: LessonCreateData): Promise<Lesson> {
    // If position not provided, set it to the next available position in the module
    if (!lessonData.position) {
      const { count } = await supabase
        .from('lessons')
        .select('id', { count: 'exact' })
        .eq('module_id', lessonData.module_id);
      
      lessonData.position = (count || 0) + 1;
    }

    const { data, error } = await supabase
      .from('lessons')
      .insert({
        ...lessonData,
        status: lessonData.status || 'draft',
        metadata: lessonData.metadata || {}
      })
      .select(`
        *,
        modules!inner(
          id,
          title,
          course_id,
          courses!inner(
            id,
            title
          )
        ),
        profiles!lessons_instructor_id_fkey(
          id,
          full_name
        )
      `)
      .single();

    if (error) throw error;

    return {
      ...data,
      module: data.modules,
      instructor: data.profiles,
      videos_count: 0,
      articles_count: 0,
      projects_count: 0,
      quizzes_count: 0
    };
  },

  // Update lesson
  async updateLesson(id: string, updateData: LessonUpdateData): Promise<Lesson> {
    const { data, error } = await supabase
      .from('lessons')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        modules!inner(
          id,
          title,
          course_id,
          courses!inner(
            id,
            title
          )
        ),
        profiles!lessons_instructor_id_fkey(
          id,
          full_name
        )
      `)
      .single();

    if (error) throw error;

    // Get content counts
    const [videosCount, articlesCount, projectsCount, quizzesCount] = await Promise.all([
      supabase.from('videos').select('id', { count: 'exact' }).eq('lesson_id', id),
      supabase.from('articles').select('id', { count: 'exact' }).eq('lesson_id', id),
      supabase.from('projects').select('id', { count: 'exact' }).eq('lesson_id', id),
      supabase.from('quizzes').select('id', { count: 'exact' }).eq('lesson_id', id)
    ]);

    return {
      ...data,
      module: data.modules,
      instructor: data.profiles,
      videos_count: videosCount.count || 0,
      articles_count: articlesCount.count || 0,
      projects_count: projectsCount.count || 0,
      quizzes_count: quizzesCount.count || 0
    };
  },

  // Delete lesson
  async deleteLesson(id: string): Promise<void> {
    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Get all modules for select dropdowns
  async getModulesForSelect(): Promise<Module[]> {
    const { data, error } = await supabase
      .from('modules')
      .select(`
        id,
        title,
        course_id,
        description,
        position,
        courses!inner(
          id,
          title
        )
      `)
      .order('position');

    if (error) throw error;

    return data?.map((module: any) => ({
      id: module.id,
      course_id: module.course_id,
      title: module.title,
      description: module.description,
      position: module.position,
      courses: module.courses
    })) || [];
  },

  // Get instructors for select dropdowns
  async getInstructorsForSelect(): Promise<{ id: string; full_name: string }[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('role', ['admin', 'instructor'])
      .order('full_name');

    if (error) throw error;

    return data || [];
  },

  // Reorder lessons within a module
  async reorderLessons(moduleId: string, lessonIds: string[]): Promise<void> {
    // Update positions based on the new order
    const updates = lessonIds.map((lessonId, index) => ({
      id: lessonId,
      position: index + 1,
      updated_at: new Date().toISOString()
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from('lessons')
        .update({
          position: update.position,
          updated_at: update.updated_at
        })
        .eq('id', update.id)
        .eq('module_id', moduleId);

      if (error) throw error;
    }
  }
};