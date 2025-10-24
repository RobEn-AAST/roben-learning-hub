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
      console.log('🔧 ProjectService - Using admin client type');
      return serverClient;
    } else {
      console.log('🔧 ProjectService - Using regular client type (will respect RLS)');
      return serverClient;
    }
  }

  async getAllProjects(clientType?: 'admin' | 'regular'): Promise<Project[]> {
    try {
      const supabaseClient = await this.getClientForRole(clientType);
      console.log('📚 ProjectService.getAllProjects - Using client type:', clientType || 'default');

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

      console.log('✅ ProjectService.getAllProjects - Found', projects.length, 'projects');
      return projects;
    } catch (error) {
      console.error('❌ ProjectService.getAllProjects - Error:', error);
      throw error;
    }
  }

  async getProjectById(id: string, clientType?: 'admin' | 'regular'): Promise<Project | null> {
    try {
      const supabaseClient = await this.getClientForRole(clientType);
      console.log('🔍 ProjectService.getProjectById - Using client type:', clientType || 'default', 'for project:', id);

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

      console.log('✅ ProjectService.getProjectById - Project found:', data.title);
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
      console.log('➕ ProjectService.createProject - Using client type:', clientType || 'default');
      console.log('➕ ProjectService.createProject - Creating project:', { lesson_id: projectData.lesson_id, title: projectData.title });

      const { data, error } = await supabaseClient
        .from('projects')
        .insert([projectData])
        .select()
        .single();

      if (error) {
        console.error('❌ ProjectService.createProject - Error:', error);
        throw new Error('Failed to create project');
      }

      console.log('✅ ProjectService.createProject - Project created successfully:', data.id);
      return data;
    } catch (error) {
      console.error('❌ ProjectService.createProject - Error:', error);
      throw error;
    }
  }

  async updateProject(id: string, projectData: UpdateProjectData, clientType?: 'admin' | 'regular'): Promise<Project> {
    try {
      const supabaseClient = await this.getClientForRole(clientType);
      console.log('✏️ ProjectService.updateProject - Using client type:', clientType || 'default', 'for project:', id);

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

      console.log('✅ ProjectService.updateProject - Project updated successfully:', data.id);
      return data;
    } catch (error) {
      console.error('❌ ProjectService.updateProject - Error:', error);
      throw error;
    }
  }

  async deleteProject(id: string, clientType?: 'admin' | 'regular'): Promise<boolean> {
    try {
      const supabaseClient = await this.getClientForRole(clientType);
      console.log('🗑️ ProjectService.deleteProject - Using client type:', clientType || 'default', 'for project:', id);

      const { error } = await supabaseClient
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ ProjectService.deleteProject - Error:', error);
        throw new Error('Failed to delete project');
      }

      console.log('✅ ProjectService.deleteProject - Project deleted successfully:', id);
      return true;
    } catch (error) {
      console.error('❌ ProjectService.deleteProject - Error:', error);
      throw error;
    }
  }

  async getProjectStats(clientType?: 'admin' | 'regular'): Promise<ProjectStats> {
    try {
      const supabaseClient = await this.getClientForRole(clientType);
      console.log('📊 ProjectService.getProjectStats - Using client type:', clientType || 'default');

      // Get total projects
      const { count: totalProjects } = await supabaseClient
        .from('projects')
        .select('*', { count: 'exact', head: true });

      // Get projects with submission platforms
      const { count: projectsWithPlatforms } = await supabaseClient
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .not('submission_platform', 'is', null);

      // Get projects with instructions
      const { count: projectsWithInstructions } = await supabaseClient
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .not('submission_instructions', 'is', null);

      // Get total lessons to calculate average
      const { count: totalLessons } = await supabaseClient
        .from('lessons')
        .select('*', { count: 'exact', head: true });

      const averageProjectsPerLesson = (totalLessons && totalLessons > 0) ? 
        Number(((totalProjects || 0) / totalLessons).toFixed(1)) : 0;

      console.log('✅ ProjectService.getProjectStats - Stats retrieved for', totalProjects || 0, 'projects');
      return {
        total_projects: totalProjects || 0,
        projects_with_platforms: projectsWithPlatforms || 0,
        projects_with_instructions: projectsWithInstructions || 0,
        average_projects_per_lesson: averageProjectsPerLesson
      };
    } catch (error) {
      console.error('❌ ProjectService.getProjectStats - Error:', error);
      throw error;
    }
  }

  async getLessonsForProjects(clientType?: 'admin' | 'regular'): Promise<Lesson[]> {
    try {
      const supabaseClient = await this.getClientForRole(clientType);
      console.log('📋 ProjectService.getLessonsForProjects - Using client type:', clientType || 'default');

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
      console.log('📋 ProjectService.getLessonsForProjects - Lessons with existing projects:', usedLessonIds.size);

      // Filter out lessons that already have projects
      const availableLessons = lessonsData?.filter((lesson: any) => !usedLessonIds.has(lesson.id)) || [];

      const lessons = availableLessons.map((lesson: any) => ({
        id: lesson.id,
        title: lesson.title,
        module_title: lesson.modules.title,
        course_title: lesson.modules.courses.title
      }));

      console.log('✅ ProjectService.getLessonsForProjects - Found', lessons.length, 'available lessons (filtered from', lessonsData?.length || 0, 'total)');
      return lessons;
    } catch (error) {
      console.error('❌ ProjectService.getLessonsForProjects - Error:', error);
      throw error;
    }
  }
}

export const projectService = new ProjectService();
