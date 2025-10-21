// Shared types for projects - can be imported in both client and server components
export type SubmissionPlatform = 'github' | 'google_drive' | 'onedrive' | 'dropbox' | 'gitlab' | 'bitbucket' | 'other';

// Platform display names
export const PLATFORM_NAMES: Record<SubmissionPlatform, string> = {
  github: 'GitHub',
  gitlab: 'GitLab',
  bitbucket: 'Bitbucket',
  google_drive: 'Google Drive',
  onedrive: 'OneDrive',
  dropbox: 'Dropbox',
  other: 'Other Platform',
};

export interface Project {
  id: string;
  lesson_id: string;
  title: string;
  description: string;
  submission_instructions: string | null;
  submission_platform: SubmissionPlatform | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  lesson_title?: string;
  course_title?: string;
  module_title?: string;
}

export interface ProjectStats {
  total_projects: number;
  projects_with_platforms: number;
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
  submission_platform?: SubmissionPlatform;
}

export interface UpdateProjectData {
  lesson_id?: string;
  title?: string;
  description?: string;
  submission_instructions?: string;
  submission_platform?: SubmissionPlatform;
}
