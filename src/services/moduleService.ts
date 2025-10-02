import { createClient } from '@/lib/supabase/client';

export interface Module {
  id: string;
  course_id: string;
  title: string;
  description: string;
  position: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Related data
  course?: {
    id: string;
    title: string;
    status: string;
  } | null;
  // Content counts
  lessons_count?: number;
}

export interface ModuleCreateData {
  course_id: string;
  title: string;
  description: string;
  position?: number;
  metadata?: Record<string, unknown>;
}

export interface ModuleUpdateData {
  title?: string;
  description?: string;
  position?: number;
  metadata?: Record<string, unknown>;
}

export interface ModuleStats {
  totalModules: number;
  modulesByCourse: { [courseId: string]: number };
  totalLessons: number;
  averageLessonsPerModule: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
}

const supabase = createClient();

export const moduleService = {
  // Get all modules with pagination and filtering
  async getModules(page = 1, limit = 10, filters?: {
    course_id?: string;
    search?: string;
  }) {
    try {
      const offset = (page - 1) * limit;
      
      // Get modules with RLS-compatible query
      let query = supabase
        .from('modules')
        .select('*', { count: 'exact' })
        .order('position', { ascending: true });

      // Apply filters
      if (filters?.course_id) {
        query = query.eq('course_id', filters.course_id);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data: modules, error, count } = await query.range(offset, offset + limit - 1);

      if (error) {
        console.error('Modules query error:', error);
        throw new Error(`Failed to fetch modules: ${error.message}`);
      }

      if (!modules || modules.length === 0) {
        return { modules: [], total: count || 0 };
      }

      // Get course information separately
      const courseIds = [...new Set(modules.map(m => m.course_id))];
      const { data: courses } = await supabase
        .from('courses')
        .select('id, title, status')
        .in('id', courseIds);

      // Get lesson counts for all modules at once (performance optimization)
      const moduleIds = modules.map(m => m.id);
      const { data: lessonCounts } = await supabase
        .from('lessons')
        .select('module_id')
        .in('module_id', moduleIds);

      // Count lessons per module
      const lessonCountMap: { [moduleId: string]: number } = {};
      lessonCounts?.forEach(lesson => {
        lessonCountMap[lesson.module_id] = (lessonCountMap[lesson.module_id] || 0) + 1;
      });

      // Transform data to include proper nesting and lesson counts
      const transformedData = modules.map((module: Module) => {
        // Find course info
        const course = courses?.find(c => c.id === module.course_id);
        
        return {
          ...module,
          course: course || null,
          lessons_count: lessonCountMap[module.id] || 0
        };
      });

      return { modules: transformedData, total: count || 0 };
    } catch (error) {
      console.error('getModules error:', error);
      throw error;
    }
  },

  // Get module statistics
  async getModuleStats(): Promise<ModuleStats> {
    const [
      modulesResult,
      lessonsResult
    ] = await Promise.all([
      supabase.from('modules').select('id, course_id'),
      supabase.from('lessons').select('id', { count: 'exact' })
    ]);

    const modules = modulesResult.data || [];
    const totalLessons = lessonsResult.count || 0;

    // Count modules by course
    const modulesByCourse: { [courseId: string]: number } = {};
    modules.forEach(module => {
      modulesByCourse[module.course_id] = (modulesByCourse[module.course_id] || 0) + 1;
    });

    return {
      totalModules: modules.length,
      modulesByCourse,
      totalLessons,
      averageLessonsPerModule: modules.length > 0 ? Math.round((totalLessons / modules.length) * 10) / 10 : 0
    };
  },

  // Get single module by ID
  async getModuleById(id: string): Promise<Module | null> {
    const { data, error } = await supabase
      .from('modules')
      .select(`
        *,
        courses!inner(
          id,
          title,
          status
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) return null;

    // Get lesson count
    const { count: lessonsCount } = await supabase
      .from('lessons')
      .select('id', { count: 'exact' })
      .eq('module_id', id);

    return {
      ...data,
      course: data.courses,
      lessons_count: lessonsCount || 0
    };
  },

  // Create new module
  async createModule(moduleData: ModuleCreateData): Promise<Module> {
    // If position not provided, set it to the next available position in the course
    if (!moduleData.position) {
      const { count } = await supabase
        .from('modules')
        .select('id', { count: 'exact' })
        .eq('course_id', moduleData.course_id);
      
      moduleData.position = (count || 0) + 1;
    }

    const { data, error } = await supabase
      .from('modules')
      .insert({
        ...moduleData,
        metadata: moduleData.metadata || {}
      })
      .select(`
        *,
        courses!inner(
          id,
          title,
          status
        )
      `)
      .single();

    if (error) throw error;

    return {
      ...data,
      course: data.courses,
      lessons_count: 0
    };
  },

  // Update module
  async updateModule(id: string, updateData: ModuleUpdateData): Promise<Module> {
    const { data, error } = await supabase
      .from('modules')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        courses!inner(
          id,
          title,
          status
        )
      `)
      .single();

    if (error) throw error;

    // Get lesson count
    const { count: lessonsCount } = await supabase
      .from('lessons')
      .select('id', { count: 'exact' })
      .eq('module_id', id);

    return {
      ...data,
      course: data.courses,
      lessons_count: lessonsCount || 0
    };
  },

  // Delete module
  async deleteModule(id: string): Promise<void> {
    // First check if module has lessons
    const { count: lessonsCount } = await supabase
      .from('lessons')
      .select('id', { count: 'exact' })
      .eq('module_id', id);

    if (lessonsCount && lessonsCount > 0) {
      throw new Error(`Cannot delete module: it contains ${lessonsCount} lesson(s). Please delete all lessons first.`);
    }

    const { error } = await supabase
      .from('modules')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Get all courses for select dropdowns
  async getCoursesForSelect(): Promise<Course[]> {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, description, status')
        .order('title');

      if (error) {
        console.error('Courses for select error:', error);
        throw new Error(`Failed to fetch courses: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('getCoursesForSelect error:', error);
      throw error;
    }
  },

  // Reorder modules within a course
  async reorderModules(courseId: string, moduleIds: string[]): Promise<void> {
    // Update positions based on the new order
    const updates = moduleIds.map((moduleId, index) => ({
      id: moduleId,
      position: index + 1,
      updated_at: new Date().toISOString()
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from('modules')
        .update({
          position: update.position,
          updated_at: update.updated_at
        })
        .eq('id', update.id)
        .eq('course_id', courseId);

      if (error) throw error;
    }
  },

  // Get modules with their lessons for a specific course
  async getModulesWithLessons(courseId: string) {
    const { data, error } = await supabase
      .from('modules')
      .select(`
        *,
        lessons (
          id,
          title,
          lesson_type,
          position,
          status
        )
      `)
      .eq('course_id', courseId)
      .order('position');

    if (error) throw error;

    return data || [];
  }
};