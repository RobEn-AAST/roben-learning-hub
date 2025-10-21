'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { SubmissionPlatform } from '@/types/project';
import type { ProjectSubmission } from '@/types/submission';
import { PLATFORM_NAMES, PLATFORM_EXAMPLES } from '@/types/submission';
import { validateSubmissionLink } from '@/utils/submissionValidation';

interface ProjectSubmissionFormProps {
  projectId: string;
  projectTitle: string;
  projectDescription: string;
  submissionInstructions?: string;
  submissionPlatform?: SubmissionPlatform;
  userId: string;
  onSubmissionComplete?: () => void;
}

// Icons
const Icons = {
  Upload: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  ),
  Check: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Edit: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  Clock: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Alert: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Link: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
};

const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { color: string; label: string }> = {
    submitted: { color: 'bg-blue-100 text-blue-800', label: 'Submitted' },
    pending_review: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending Review' },
    reviewed: { color: 'bg-purple-100 text-purple-800', label: 'Reviewed' },
    approved: { color: 'bg-green-100 text-green-800', label: '✓ Approved' },
    rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
    resubmission_required: { color: 'bg-orange-100 text-orange-800', label: 'Resubmission Required' },
  };

  const config = statusConfig[status] || statusConfig.submitted;
  return <Badge className={config.color}>{config.label}</Badge>;
};

export default function ProjectSubmissionForm({
  projectId,
  projectTitle,
  projectDescription,
  submissionInstructions,
  submissionPlatform,
  userId,
  onSubmissionComplete,
}: ProjectSubmissionFormProps) {
  const [submission, setSubmission] = useState<ProjectSubmission | null>(null);
  const [submissionLink, setSubmissionLink] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadSubmission();
  }, [projectId, userId]);

  const loadSubmission = async () => {
    try {
      setLoading(true);
      // Use API route instead of service
      const response = await fetch(`/api/submissions?project_id=${projectId}&user_id=${userId}`);
      if (response.ok) {
        const submissions = await response.json();
        const existingSubmission = submissions.find((s: ProjectSubmission) => 
          s.project_id === projectId && s.user_id === userId
        );
        
        if (existingSubmission) {
          setSubmission(existingSubmission);
          setSubmissionLink(existingSubmission.submission_link);
        }
      }
    } catch (err) {
      console.error('Error loading submission:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!submissionLink.trim()) {
      setError('Please provide a submission link');
      return;
    }

    if (!submissionPlatform) {
      setError('Submission platform not configured for this project');
      return;
    }

    // Validate the link format
    const validation = validateSubmissionLink(
      submissionLink,
      submissionPlatform
    );

    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    try {
      setSubmitting(true);

      if (submission) {
        // Update existing submission
        await fetch(`/api/submissions/${submission.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            submission_link: submissionLink,
            submission_platform: submissionPlatform,
            status: 'submitted', // Reset to submitted on update
          }),
        });
        setSuccess('Submission updated successfully! Waiting for instructor review.');
      } else {
        // Create new submission
        await fetch('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projectId,
            submission_link: submissionLink,
            submission_platform: submissionPlatform,
          }),
        });
        setSuccess('Project submitted successfully! Waiting for instructor review.');
      }

      setIsEditing(false);
      await loadSubmission();
      
      if (onSubmissionComplete) {
        onSubmissionComplete();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit project. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading submission...</div>
        </CardContent>
      </Card>
    );
  }

  const canEdit = !submission || ['submitted', 'resubmission_required'].includes(submission.status);
  const isApproved = submission?.status === 'approved';
  const needsResubmission = submission?.status === 'resubmission_required';

  return (
    <div className="space-y-6">
      {/* Project Info */}
      <Card>
        <CardHeader>
          <CardTitle>{projectTitle}</CardTitle>
          <CardDescription>Project Assignment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Description:</h4>
            <p className="text-gray-700 whitespace-pre-wrap">{projectDescription}</p>
          </div>

          {submissionInstructions && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold mb-2 text-blue-900">📋 Submission Instructions:</h4>
              <p className="text-blue-800 whitespace-pre-wrap">{submissionInstructions}</p>
            </div>
          )}

          {submissionPlatform && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Submission Platform:</h4>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">
                  <Icons.Link />
                  <span className="ml-1">{PLATFORM_NAMES[submissionPlatform]}</span>
                </Badge>
                <span className="text-sm text-gray-600">
                  Example: {PLATFORM_EXAMPLES[submissionPlatform]}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submission Status */}
      {submission && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Your Submission</CardTitle>
              <StatusBadge status={submission.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Submitted Link:</Label>
              <a
                href={submission.submission_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-blue-600 hover:underline mt-1"
              >
                <Icons.Link />
                <span className="break-all">{submission.submission_link}</span>
              </a>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-gray-600">Submitted At:</Label>
                <p>{new Date(submission.submitted_at).toLocaleString()}</p>
              </div>
              {submission.reviewed_at && (
                <div>
                  <Label className="text-gray-600">Reviewed At:</Label>
                  <p>{new Date(submission.reviewed_at).toLocaleString()}</p>
                </div>
              )}
            </div>

            {submission.feedback && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <Label className="font-semibold text-yellow-900">Instructor Feedback:</Label>
                <p className="text-yellow-800 mt-2 whitespace-pre-wrap">{submission.feedback}</p>
              </div>
            )}

            {submission.grade !== null && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <Label className="font-semibold text-green-900">Grade:</Label>
                <p className="text-2xl font-bold text-green-800 mt-1">{submission.grade}/100</p>
              </div>
            )}

            {isApproved && (
              <div className="bg-green-100 p-4 rounded-lg border-2 border-green-500 text-center">
                <Icons.Check />
                <p className="font-semibold text-green-900">
                  ✓ Your project has been approved! You can continue to the next lesson.
                </p>
              </div>
            )}

            {needsResubmission && (
              <div className="bg-orange-100 p-4 rounded-lg border-2 border-orange-500">
                <div className="flex items-start space-x-2">
                  <Icons.Alert />
                  <p className="font-semibold text-orange-900">
                    Resubmission required. Please review the feedback and update your submission.
                  </p>
                </div>
              </div>
            )}

            {canEdit && !isEditing && (
              <Button onClick={() => setIsEditing(true)} variant="outline" className="w-full">
                <Icons.Edit />
                <span className="ml-2">Update Submission</span>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submission Form */}
      {(!submission || isEditing) && canEdit && submissionPlatform && (
        <Card>
          <CardHeader>
            <CardTitle>{submission ? 'Update Submission' : 'Submit Project'}</CardTitle>
            <CardDescription>
              Provide your {PLATFORM_NAMES[submissionPlatform]} link below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="submission_link">
                  {PLATFORM_NAMES[submissionPlatform]} Link *
                </Label>
                <Input
                  id="submission_link"
                  type="url"
                  value={submissionLink}
                  onChange={(e) => setSubmissionLink(e.target.value)}
                  placeholder={PLATFORM_EXAMPLES[submissionPlatform]}
                  required
                  className="mt-2"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Make sure your link is publicly accessible or shared with your instructor
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg">
                  {success}
                </div>
              )}

              <div className="flex space-x-3">
                {isEditing && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setSubmissionLink(submission?.submission_link || '');
                      setError('');
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                )}
                <Button type="submit" disabled={submitting} className="flex-1">
                  <Icons.Upload />
                  <span className="ml-2">
                    {submitting ? 'Submitting...' : submission ? 'Update Submission' : 'Submit Project'}
                  </span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!submissionPlatform && !submission && (
        <Card>
          <CardContent className="p-6 text-center text-gray-600">
            <Icons.Alert />
            <p className="mt-2">
              This project doesn't have a submission platform configured yet.
              Please contact your instructor.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
