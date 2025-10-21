import type { SubmissionPlatform } from './project';

// Shared types for project submissions
export type SubmissionStatus = 'submitted' | 'pending_review' | 'reviewed' | 'approved' | 'rejected' | 'resubmission_required';

export interface ProjectSubmission {
  id: string;
  project_id: string;
  user_id: string;
  submission_link: string;
  submission_platform: SubmissionPlatform;
  status: SubmissionStatus;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  feedback: string | null;
  grade: number | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  project_title?: string;
  user_name?: string;
  reviewer_name?: string;
}

export interface CreateSubmissionData {
  project_id: string;
  submission_link: string;
  submission_platform: SubmissionPlatform;
}

export interface UpdateSubmissionData {
  submission_link?: string;
  submission_platform?: SubmissionPlatform;
  status?: SubmissionStatus;
  feedback?: string;
  grade?: number;
  reviewed_by?: string;
  reviewed_at?: string;
}

export interface SubmissionStats {
  total_submissions: number;
  submitted_count: number;
  pending_review_count: number;
  approved_count: number;
  rejected_count: number;
  average_grade: number;
}

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

// Platform example URLs
export const PLATFORM_EXAMPLES: Record<SubmissionPlatform, string> = {
  github: 'https://github.com/username/repository',
  gitlab: 'https://gitlab.com/username/repository',
  bitbucket: 'https://bitbucket.org/username/repository',
  google_drive: 'https://drive.google.com/file/d/your-file-id',
  onedrive: 'https://1drv.ms/your-share-link',
  dropbox: 'https://www.dropbox.com/s/your-file-id',
  other: 'https://your-platform.com/your-submission',
};
