import { createClient } from '@/lib/supabase/client';

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  lesson_type: 'video' | 'article' | 'project' | 'quiz';
  position: number;
  status: 'visible' | 'hidden';
  instructor_id: string;
  metadata: Record<string, unknown>;
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
    first_name: string;
    last_name: string;
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
  status?: 'visible' | 'hidden';
  instructor_id: string;
  metadata?: Record<string, unknown>;
}

export interface LessonUpdateData {
  title?: string;
  lesson_type?: 'video' | 'article' | 'project' | 'quiz';
  position?: number;
  status?: 'visible' | 'hidden';
  instructor_id?: string;
  metadata?: Record<string, unknown>;
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

// Server-side helper functions for API routes
export const serverLessonService = {
  // Get instructors for select dropdowns (server-side)
  async getInstructorsForSelect(supabaseClient: ReturnType<typeof createClient>): Promise<{ id: string; first_name: string; last_name: string }[]> {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('role', 'instructor')
      .order('first_name')
      .order('last_name');

    if (error) throw error;

    return data || [];
  },

  // Get lessons with server-side client (for API routes)
  async getLessons(supabaseClient: ReturnType<typeof createClient>, page = 1, limit = 10, filters?: {
    module_id?: string;
    course_id?: string;
    lesson_type?: string;
    status?: string;
  }) {
    const offset = (page - 1) * limit;
    
    let query = supabaseClient
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
        profiles!instructor_id(
          id,
          first_name,
          last_name
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

    // Transform data to include proper nesting (much faster - no additional queries)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformedData = (data || []).map((lesson: any) => {
      return {
        ...lesson,
        module: lesson.modules,
        instructor: lesson.profiles, // Instructor data from join
        videos_count: 0, // Remove expensive content counts for now - add them back later if needed
        articles_count: 0,
        projects_count: 0,
        quizzes_count: 0
      };
    });

    return { lessons: transformedData, total: count || 0 };
  },

  // Create lesson with server-side client (for API routes)
  async createLesson(supabaseClient: ReturnType<typeof createClient>, lessonData: LessonCreateData): Promise<Lesson> {
    // If position not provided, set it to the next available position in the module
    if (!lessonData.position) {
      const { count } = await supabaseClient
        .from('lessons')
        .select('id', { count: 'exact' })
        .eq('module_id', lessonData.module_id);
      
      lessonData.position = (count || 0) + 1;
    }

    const { data, error } = await supabaseClient
      .from('lessons')
      .insert({
        ...lessonData,
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
        instructor:profiles!lessons_instructor_id_fkey(
          id,
          full_name
        )
      `)
      .single();

    if (error) throw error;

    return {
      ...data,
      module: data.modules,
      videos_count: 0,
      articles_count: 0,
      projects_count: 0,
      quizzes_count: 0
    };
  },
};

export const lessonService = {
  // Get all lessons with pagination and filtering
  async getLessons(page = 1, limit = 10, filters?: {
    module_id?: string;
    course_id?: string;
    lesson_type?: string;
    status?: string;
  }) {
    try {
      const offset = (page - 1) * limit;
      
      // Build query with simple select to avoid RLS issues
      let query = supabase
        .from('lessons')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.module_id) {
        query = query.eq('module_id', filters.module_id);
      }
      if (filters?.lesson_type) {
        query = query.eq('lesson_type', filters.lesson_type);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      // Handle course_id filter by getting modules first
      if (filters?.course_id) {
        const { data: moduleIds } = await supabase
          .from('modules')
          .select('id')
          .eq('course_id', filters.course_id);
        
        if (moduleIds && moduleIds.length > 0) {
          query = query.in('module_id', moduleIds.map(m => m.id));
        } else {
          // No modules found for course, return empty result
          return { lessons: [], total: 0 };
        }
      }

      const { data: lessons, error, count } = await query.range(offset, offset + limit - 1);

      if (error) {
        console.error('Lessons query error:', error);
        throw new Error(`Failed to fetch lessons: ${error.message}`);
      }

      if (!lessons || lessons.length === 0) {
        return { lessons: [], total: count || 0 };
      }

      // Get related data separately
      const moduleIds = [...new Set(lessons.map(l => l.module_id))];
      const instructorIds = [...new Set(lessons.map(l => l.instructor_id).filter(Boolean))];

      // Get modules and their courses
      const { data: modules } = await supabase
        .from('modules')
        .select('id, title, course_id')
        .in('id', moduleIds);

      const courseIds = [...new Set(modules?.map(m => m.course_id) || [])];
      const { data: courses } = await supabase
        .from('courses')
        .select('id, title')
        .in('id', courseIds);

      // Get instructors
      const { data: instructors } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', instructorIds);

      // Transform lessons with related data
      const transformedLessons = await Promise.all(lessons.map(async lesson => {
        const moduleData = modules?.find(m => m.id === lesson.module_id);
        const course = courses?.find(c => c.id === moduleData?.course_id);
        const instructor = instructors?.find(i => i.id === lesson.instructor_id);

        // Get content counts
        const [videosCount, articlesCount, projectsCount, quizzesCount] = await Promise.all([
          supabase.from('videos').select('id', { count: 'exact' }).eq('lesson_id', lesson.id).then(r => r.count || 0),
          supabase.from('articles').select('id', { count: 'exact' }).eq('lesson_id', lesson.id).then(r => r.count || 0),
          supabase.from('projects').select('id', { count: 'exact' }).eq('lesson_id', lesson.id).then(r => r.count || 0),
          supabase.from('quizzes').select('id', { count: 'exact' }).eq('lesson_id', lesson.id).then(r => r.count || 0),
        ]);

        return {
          ...lesson,
          module: moduleData ? {
            ...moduleData,
            courses: course || null
          } : null,
          instructor: instructor || null,
          videos_count: videosCount,
          articles_count: articlesCount,
          projects_count: projectsCount,
          quizzes_count: quizzesCount
        };
      }));

      return { lessons: transformedLessons, total: count || 0 };
    } catch (error) {
      console.error('getLessons error:', error);
      throw error;
    }
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
        profiles(
          id,
          first_name,
          last_name
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
        profiles(
          id,
          first_name,
          last_name
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
        profiles(
          id,
          first_name,
          last_name
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
  async getModulesForSelect(limit = 500): Promise<Module[]> {
    // PERFORMANCE FIX: Added default limit to prevent fetching unlimited records
    // Default 500 modules (reasonable for dropdowns, covers 99% of cases)
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
      .order('position')
      .limit(limit);

    if (error) throw error;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data?.map((moduleItem: any) => ({
      id: moduleItem.id,
      course_id: moduleItem.course_id,
      title: moduleItem.title,
      description: moduleItem.description,
      position: moduleItem.position,
      courses: moduleItem.courses
    })) || [];
  },

  // Get instructors for select dropdowns
  async getInstructorsForSelect(limit = 200): Promise<{ id: string; first_name: string; last_name: string }[]> {
    // PERFORMANCE FIX: Added default limit to prevent fetching unlimited records
    // Default 200 instructors (reasonable for most institutions)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('role', 'instructor')
      .order('first_name')
      .order('last_name')
      .limit(limit);

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