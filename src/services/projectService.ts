import { createClient } from '@/lib/supabase/client';
import { createClient as createServerClient } from '@/lib/supabase/server';
import type {
  SubmissionPlatform,
  PLATFORM_NAMES,
  Project,
  ProjectStats,
  Lesson,
  CreateProjectData,
  UpdateProjectData,
} from '@/types/project';

// Re-export types for backward compatibility
export type {
  SubmissionPlatform,
  Project,
  ProjectStats,
  Lesson,
  CreateProjectData,
  UpdateProjectData,
};
export { PLATFORM_NAMES } from '@/types/project';

class ProjectService {
  private supabase = createClient();

  // Helper method to get appropriate client based on user role
  private async getClientForRole(clientType?: 'admin' | 'regular'): Promise<any> {
    const serverClient = await createServerClient();
    
    if (clientType === 'admin') {
      return serverClient;
    } else {
      return serverClient;
    }
  }

  async getAllProjects(clientType?: 'admin' | 'regular'): Promise<Project[]> {
    try {
      const supabaseClient = await this.getClientForRole(clientType);

      const { data, error } = await supabaseClient
        .from('projects')
        .select(`
          *,
          lessons!inner(
            title,
            modules!inner(
              title,
              courses!inner(
                title
              )
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ ProjectService.getAllProjects - Error:', error);
        throw new Error('Failed to fetch projects');
      }

      // Transform the data to flatten the joined fields
      const projects = data.map((project: any) => ({
        ...project,
        lesson_title: project.lessons.title,
        module_title: project.lessons.modules.title,
        course_title: project.lessons.modules.courses.title
      }));

      return projects;
    } catch (error) {
      console.error('❌ ProjectService.getAllProjects - Error:', error);
      throw error;
    }
  }

  async getProjectById(id: string, clientType?: 'admin' | 'regular'): Promise<Project | null> {
    try {
      const supabaseClient = await this.getClientForRole(clientType);

      const { data, error } = await supabaseClient
        .from('projects')
        .select(`
          *,
          lessons!inner(
            title,
            modules!inner(
              title,
              courses!inner(
                title
              )
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ ProjectService.getProjectById - Error:', error);
        return null;
      }

      return {
        ...data,
        lesson_title: data.lessons.title,
        module_title: data.lessons.modules.title,
        course_title: data.lessons.modules.courses.title
      };
    } catch (error) {
      console.error('❌ ProjectService.getProjectById - Error:', error);
      return null;
    }
  }

  async createProject(projectData: CreateProjectData, clientType?: 'admin' | 'regular'): Promise<Project> {
    try {
      const supabaseClient = await this.getClientForRole(clientType);

      const { data, error } = await supabaseClient
        .from('projects')
        .insert([projectData])
        .select()
        .single();

      if (error) {
        console.error('❌ ProjectService.createProject - Error:', error);
        throw new Error('Failed to create project');
      }

      return data;
    } catch (error) {
      console.error('❌ ProjectService.createProject - Error:', error);
      throw error;
    }
  }

  async updateProject(id: string, projectData: UpdateProjectData, clientType?: 'admin' | 'regular'): Promise<Project> {
    try {
      const supabaseClient = await this.getClientForRole(clientType);

      const { data, error } = await supabaseClient
        .from('projects')
        .update(projectData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ ProjectService.updateProject - Error:', error);
        throw new Error('Failed to update project');
      }

      return data;
    } catch (error) {
      console.error('❌ ProjectService.updateProject - Error:', error);
      throw error;
    }
  }

  async deleteProject(id: string, clientType?: 'admin' | 'regular'): Promise<boolean> {
    try {
      const supabaseClient = await this.getClientForRole(clientType);

      const { error } = await supabaseClient
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ ProjectService.deleteProject - Error:', error);
        throw new Error('Failed to delete project');
      }

      return true;
    } catch (error) {
      console.error('❌ ProjectService.deleteProject - Error:', error);
      throw error;
    }
  }

  async getProjectStats(clientType?: 'admin' | 'regular'): Promise<ProjectStats> {
    try {
      const supabaseClient = await this.getClientForRole(clientType);

      // All 4 counts are independent — run in parallel
      const [totalRes, platformsRes, instructionsRes, lessonsRes] = await Promise.all([
        supabaseClient.from('projects').select('*', { count: 'exact', head: true }),
        supabaseClient.from('projects').select('*', { count: 'exact', head: true }).not('submission_platform', 'is', null),
        supabaseClient.from('projects').select('*', { count: 'exact', head: true }).not('submission_instructions', 'is', null),
        supabaseClient.from('lessons').select('*', { count: 'exact', head: true }),
      ]);

      const totalProjects = totalRes.count || 0;
      const totalLessons = lessonsRes.count || 0;
      const averageProjectsPerLesson = totalLessons > 0
        ? Number((totalProjects / totalLessons).toFixed(1))
        : 0;

      return {
        total_projects: totalProjects,
        projects_with_platforms: platformsRes.count || 0,
        projects_with_instructions: instructionsRes.count || 0,
        average_projects_per_lesson: averageProjectsPerLesson
      };
    } catch (error) {
      throw error;
    }
  }

  async getLessonsForProjects(clientType?: 'admin' | 'regular'): Promise<Lesson[]> {
    try {
      const supabaseClient = await this.getClientForRole(clientType);

      // First, get all project-type lessons
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
        .eq('lesson_type', 'project')  // Only get project lessons
        .order('title');

      if (lessonsError) {
        console.error('❌ ProjectService.getLessonsForProjects - Error fetching lessons:', lessonsError);
        throw new Error('Failed to fetch lessons');
      }

      // Get all lesson IDs that already have projects
      const { data: projectsData, error: projectsError } = await supabaseClient
        .from('projects')
        .select('lesson_id');

      if (projectsError) {
        console.error('❌ ProjectService.getLessonsForProjects - Error fetching projects:', projectsError);
        throw projectsError;
      }

      // Create a Set of lesson IDs that already have projects
      const usedLessonIds = new Set(projectsData?.map((project: { lesson_id: string }) => project.lesson_id) || []);

      // Filter out lessons that already have projects
      const availableLessons = lessonsData?.filter((lesson: any) => !usedLessonIds.has(lesson.id)) || [];

      const lessons = availableLessons.map((lesson: any) => ({
        id: lesson.id,
        title: lesson.title,
        module_title: lesson.modules.title,
        course_title: lesson.modules.courses.title
      }));

      return lessons;
    } catch (error) {
      console.error('❌ ProjectService.getLessonsForProjects - Error:', error);
      throw error;
    }
  }
}

export const projectService = new ProjectService();
