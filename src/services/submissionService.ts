import { createClient } from '@/lib/supabase/client';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/adminHelpers';
import type { SubmissionPlatform } from '@/types/project';
import type {
  SubmissionStatus,
  ProjectSubmission,
  CreateSubmissionData,
  UpdateSubmissionData,
  SubmissionStats,
} from '@/types/submission';
import { PLATFORM_NAMES, PLATFORM_EXAMPLES } from '@/types/submission';
import { validateSubmissionLink as validateLink } from '@/utils/submissionValidation';

// Re-export types for backward compatibility
export type {
  SubmissionStatus,
  ProjectSubmission,
  CreateSubmissionData,
  UpdateSubmissionData,
  SubmissionStats,
};
export { PLATFORM_NAMES, PLATFORM_EXAMPLES };

class SubmissionService {
  private supabase = createClient();

  // Helper method to get appropriate client based on user role
  private async getClientForRole(clientType?: 'admin' | 'regular'): Promise<any> {
    if (clientType === 'admin') {
      // Use service-role client to bypass RLS for admin/instructor operations
      return createAdminClient();
    }
    return createServerClient();
  }

  /**
   * Validate submission link against platform pattern
   */
  validateSubmissionLink(link: string, platform: SubmissionPlatform): { valid: boolean; message: string } {
    return validateLink(link, platform);
  }

  /**
   * Get all submissions (with filters)
   */
  async getAllSubmissions(
    filters?: {
      project_id?: string;
      project_ids?: string[];
      user_id?: string;
      status?: SubmissionStatus;
    },
    clientType?: 'admin' | 'regular'
  ): Promise<ProjectSubmission[]> {
    try {
      const supabaseClient = await this.getClientForRole(clientType);

      // Minimal projection for list view to reduce payload; details are fetched per-item when needed
      let query = supabaseClient
        .from('project_submissions')
        .select(`
          id, project_id, user_id, submission_link, submission_platform, status, grade, submitted_at,
          projects!inner(title, lesson_id, lessons!inner(id, title, modules!inner(id, course_id, courses!inner(id, title)))),
          profiles!project_submissions_user_id_fkey(first_name, last_name, email),
          reviewer:profiles!project_submissions_reviewed_by_fkey(first_name, last_name)
        `)
        .order('submitted_at', { ascending: false });

      if (filters?.project_id) {
        query = query.eq('project_id', filters.project_id);
      }

      if (filters?.project_ids && filters.project_ids.length > 0) {
        query = query.in('project_id', filters.project_ids);
      }

      if (filters?.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ SubmissionService.getAllSubmissions - Error:', error);
        throw new Error('Failed to fetch submissions');
      }

      const submissions = data.map((submission: any) => ({
        ...submission,
        project_title: submission.projects?.title,
        lesson_title: submission.projects?.lessons?.title,
        course_id: submission.projects?.lessons?.modules?.courses?.id,
        course_title: submission.projects?.lessons?.modules?.courses?.title,
        user_name: `${submission.profiles?.first_name || ''} ${submission.profiles?.last_name || ''}`.trim(),
        reviewer_name: `${submission.reviewer?.first_name || ''} ${submission.reviewer?.last_name || ''}`.trim(),
        student_name: `${submission.profiles?.first_name || ''} ${submission.profiles?.last_name || ''}`.trim(),
        student_email: submission.profiles?.email || ''
      }));

      return submissions;
    } catch (error) {
      console.error('❌ SubmissionService.getAllSubmissions - Error:', error);
      throw error;
    }
  }

  /**
   * Get submission by ID
   */
  async getSubmissionById(id: string, clientType?: 'admin' | 'regular'): Promise<ProjectSubmission | null> {
    try {
      const supabaseClient = await this.getClientForRole(clientType);

      const { data, error } = await supabaseClient
        .from('project_submissions')
        .select(`
          *,
          projects!inner(title, lesson_id, lessons!inner(id, title, modules!inner(id, course_id, courses!inner(id, title)))),
          profiles!project_submissions_user_id_fkey(first_name, last_name, email),
          reviewer:profiles!project_submissions_reviewed_by_fkey(first_name, last_name)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ SubmissionService.getSubmissionById - Error:', error);
        return null;
      }

      return {
        ...data,
        project_title: data.projects?.title,
        lesson_title: data.projects?.lessons?.title,
        course_id: data.projects?.lessons?.modules?.courses?.id,
        course_title: data.projects?.lessons?.modules?.courses?.title,
        user_name: `${data.profiles?.first_name || ''} ${data.profiles?.last_name || ''}`.trim(),
        reviewer_name: `${data.reviewer?.first_name || ''} ${data.reviewer?.last_name || ''}`.trim(),
        student_name: `${data.profiles?.first_name || ''} ${data.profiles?.last_name || ''}`.trim(),
        student_email: data.profiles?.email || ''
      };
    } catch (error) {
      console.error('❌ SubmissionService.getSubmissionById - Error:', error);
      return null;
    }
  }

  /**
   * Get user's submission for a specific project
   */
  async getUserProjectSubmission(
    projectId: string,
    userId: string,
    clientType?: 'admin' | 'regular'
  ): Promise<ProjectSubmission | null> {
    try {
      const supabaseClient = await this.getClientForRole(clientType);

      const { data, error } = await supabaseClient
        .from('project_submissions')
        .select(`
          *,
          projects!inner(title, lesson_id, lessons!inner(id, title, modules!inner(id, course_id, courses!inner(id, title)))),
          profiles!project_submissions_user_id_fkey(first_name, last_name, email),
          reviewer:profiles!project_submissions_reviewed_by_fkey(first_name, last_name)
        `)
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No submission found
          return null;
        }
        console.error('❌ SubmissionService.getUserProjectSubmission - Error:', error);
        throw error;
      }

      return {
        ...data,
        project_title: data.projects?.title,
        lesson_title: data.projects?.lessons?.title,
        course_id: data.projects?.lessons?.modules?.courses?.id,
        course_title: data.projects?.lessons?.modules?.courses?.title,
        user_name: `${data.profiles?.first_name || ''} ${data.profiles?.last_name || ''}`.trim(),
        reviewer_name: `${data.reviewer?.first_name || ''} ${data.reviewer?.last_name || ''}`.trim(),
        student_name: `${data.profiles?.first_name || ''} ${data.profiles?.last_name || ''}`.trim(),
        student_email: data.profiles?.email || ''
      };
    } catch (error) {
      console.error('❌ SubmissionService.getUserProjectSubmission - Error:', error);
      throw error;
    }
  }
  /**
   * Create new submission
   */
  async createSubmission(
    submissionData: CreateSubmissionData,
    userId: string,
    clientType?: 'admin' | 'regular'
  ): Promise<ProjectSubmission> {
    try {
      // Validate submission link
      const validation = this.validateSubmissionLink(
        submissionData.submission_link,
        submissionData.submission_platform
      );

      if (!validation.valid) {
        throw new Error(validation.message);
      }

      const supabaseClient = await this.getClientForRole(clientType);

      const { data, error } = await supabaseClient
        .from('project_submissions')
        .insert([{
          ...submissionData,
          user_id: userId,
          status: 'submitted'
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ SubmissionService.createSubmission - Error:', error);
        if (error.code === '23505') {
          throw new Error('You have already submitted this project. Please update your existing submission.');
        }
        throw new Error('Failed to create submission');
      }

      return data;
    } catch (error) {
      console.error('❌ SubmissionService.createSubmission - Error:', error);
      throw error;
    }
  }

  /**
   * Update submission
   */
  async updateSubmission(
    id: string,
    submissionData: UpdateSubmissionData,
    clientType?: 'admin' | 'regular'
  ): Promise<ProjectSubmission> {
    try {
      // Validate submission link if provided
      if (submissionData.submission_link && submissionData.submission_platform) {
        const validation = this.validateSubmissionLink(
          submissionData.submission_link,
          submissionData.submission_platform
        );

        if (!validation.valid) {
          throw new Error(validation.message);
        }
      }

      const supabaseClient = await this.getClientForRole(clientType);

      // If status is being updated to approved/rejected, set reviewed_at
      const updateData = { ...submissionData };
      if (updateData.status && ['approved', 'rejected'].includes(updateData.status)) {
        updateData.reviewed_at = new Date().toISOString();
      }

      const { data, error } = await supabaseClient
        .from('project_submissions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ SubmissionService.updateSubmission - Error:', error);
        throw new Error('Failed to update submission');
      }

      return data;
    } catch (error) {
      console.error('❌ SubmissionService.updateSubmission - Error:', error);
      throw error;
    }
  }

  /**
   * Delete submission
   */
  async deleteSubmission(id: string, clientType?: 'admin' | 'regular'): Promise<boolean> {
    try {
      const supabaseClient = await this.getClientForRole(clientType);

      const { error } = await supabaseClient
        .from('project_submissions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ SubmissionService.deleteSubmission - Error:', error);
        throw new Error('Failed to delete submission');
      }

      return true;
    } catch (error) {
      console.error('❌ SubmissionService.deleteSubmission - Error:', error);
      throw error;
    }
  }

  /**
   * Get submission statistics for a project
   */
  async getProjectSubmissionStats(projectId: string, clientType?: 'admin' | 'regular'): Promise<SubmissionStats> {
    try {
      const supabaseClient = await this.getClientForRole(clientType);

      const { data, error } = await supabaseClient
        .rpc('get_project_submission_stats', { p_project_id: projectId });

      if (error) {
        console.error('❌ SubmissionService.getProjectSubmissionStats - Error:', error);
        throw new Error('Failed to fetch submission stats');
      }

      return data[0] || {
        total_submissions: 0,
        submitted_count: 0,
        pending_review_count: 0,
        approved_count: 0,
        rejected_count: 0,
        average_grade: 0,
      };
    } catch (error) {
      console.error('❌ SubmissionService.getProjectSubmissionStats - Error:', error);
      throw error;
    }
  }

  /**
   * Check if user can complete a lesson (for project lessons)
   */
  async canCompleteLesson(lessonId: string, userId: string, clientType?: 'admin' | 'regular'): Promise<{
    can_complete: boolean;
    reason: string;
  }> {
    try {
      const supabaseClient = await this.getClientForRole(clientType);

      const { data, error } = await supabaseClient
        .rpc('can_complete_lesson', { p_lesson_id: lessonId, p_user_id: userId });

      if (error) {
        console.error('❌ SubmissionService.canCompleteLesson - Error:', error);
        throw new Error('Failed to check lesson completion status');
      }

      return data[0] || { can_complete: false, reason: 'Unknown error' };
    } catch (error) {
      console.error('❌ SubmissionService.canCompleteLesson - Error:', error);
      throw error;
    }
  }
}

export const submissionService = new SubmissionService();
