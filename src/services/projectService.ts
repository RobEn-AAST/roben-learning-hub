import { createClient } from '@/lib/supabase/client';

export interface Project {
  id: string;
  lesson_id: string;
  title: string;
  description: string;
  submission_instructions: string | null;
  external_link: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  lesson_title?: string;
  course_title?: string;
  module_title?: string;
}

export interface ProjectStats {
  total_projects: number;
  projects_with_external_links: number;
  projects_with_instructions: number;
  average_projects_per_lesson: number;
}

export interface Lesson {
  id: string;
  title: string;
  module_title: string;
  course_title: string;
}

export interface CreateProjectData {
  lesson_id: string;
  title: string;
  description: string;
  submission_instructions?: string;
  external_link?: string;
}

export interface UpdateProjectData {
  lesson_id?: string;
  title?: string;
  description?: string;
  submission_instructions?: string;
  external_link?: string;
}

class ProjectService {
  private supabase = createClient();

  async getAllProjects(): Promise<Project[]> {
    const { data, error } = await this.supabase
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
      console.error('Error fetching projects:', error);
      throw new Error('Failed to fetch projects');
    }

    // Transform the data to flatten the joined fields
    return data.map(project => ({
      ...project,
      lesson_title: project.lessons.title,
      module_title: project.lessons.modules.title,
      course_title: project.lessons.modules.courses.title
    }));
  }

  async getProjectById(id: string): Promise<Project | null> {
    const { data, error } = await this.supabase
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
      console.error('Error fetching project:', error);
      return null;
    }

    return {
      ...data,
      lesson_title: data.lessons.title,
      module_title: data.lessons.modules.title,
      course_title: data.lessons.modules.courses.title
    };
  }

  async createProject(projectData: CreateProjectData): Promise<Project> {
    const { data, error } = await this.supabase
      .from('projects')
      .insert([projectData])
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      throw new Error('Failed to create project');
    }

    return data;
  }

  async updateProject(id: string, projectData: UpdateProjectData): Promise<Project> {
    const { data, error } = await this.supabase
      .from('projects')
      .update(projectData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating project:', error);
      throw new Error('Failed to update project');
    }

    return data;
  }

  async deleteProject(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting project:', error);
      throw new Error('Failed to delete project');
    }

    return true;
  }

  async getProjectStats(): Promise<ProjectStats> {
    // Get total projects
    const { count: totalProjects } = await this.supabase
      .from('projects')
      .select('*', { count: 'exact', head: true });

    // Get projects with external links
    const { count: projectsWithExternalLinks } = await this.supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .not('external_link', 'is', null);

    // Get projects with instructions
    const { count: projectsWithInstructions } = await this.supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .not('submission_instructions', 'is', null);

    // Get total lessons to calculate average
    const { count: totalLessons } = await this.supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true });

    const averageProjectsPerLesson = (totalLessons && totalLessons > 0) ? 
      Number(((totalProjects || 0) / totalLessons).toFixed(1)) : 0;

    return {
      total_projects: totalProjects || 0,
      projects_with_external_links: projectsWithExternalLinks || 0,
      projects_with_instructions: projectsWithInstructions || 0,
      average_projects_per_lesson: averageProjectsPerLesson
    };
  }

  async getLessonsForProjects(): Promise<Lesson[]> {
    const { data, error } = await this.supabase
      .from('lessons')
      .select(`
        id,
        title,
        modules!inner(
          title,
          courses!inner(
            title
          )
        )
      `)
      .order('title');

    if (error) {
      console.error('Error fetching lessons:', error);
      throw new Error('Failed to fetch lessons');
    }

    return data.map((lesson: any) => ({
      id: lesson.id,
      title: lesson.title,
      module_title: lesson.modules.title,
      course_title: lesson.modules.courses.title
    }));
  }
}

export const projectService = new ProjectService();
