'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ProjectSubmissionFormProps {
  lessonId: string;
  lessonTitle: string;
  projectTitle?: string | null;
  projectDescription?: string | null;
  projectInstructions?: string | null;
  projectPlatform?: string | null;
  onSubmitSuccess?: () => void;
}

interface ExistingSubmission {
  id: string;
  submission_link: string;
  submission_platform: string;
  status: string;
  submitted_at: string;
  reviewed_at?: string;
  feedback?: string;
  metadata?: {
    notes?: string;
  };
}

// Platform configuration
const PLATFORMS = {
  github: {
    name: 'GitHub',
    icon: '🐙',
    urlPattern: /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?.*$/,
    placeholder: 'https://github.com/username/repository',
    example: 'https://github.com/username/my-project',
    helpText: 'Enter the full GitHub repository URL'
  },
  gitlab: {
    name: 'GitLab',
    icon: '🦊',
    urlPattern: /^https?:\/\/(www\.)?gitlab\.com\/[\w-]+\/[\w.-]+\/?.*$/,
    placeholder: 'https://gitlab.com/username/repository',
    example: 'https://gitlab.com/username/my-project',
    helpText: 'Enter the full GitLab repository URL'
  },
  bitbucket: {
    name: 'Bitbucket',
    icon: '🪣',
    urlPattern: /^https?:\/\/(www\.)?bitbucket\.org\/[\w-]+\/[\w.-]+\/?.*$/,
    placeholder: 'https://bitbucket.org/username/repository',
    example: 'https://bitbucket.org/username/my-project',
    helpText: 'Enter the full Bitbucket repository URL'
  },
  google_drive: {
    name: 'Google Drive',
    icon: '📁',
    urlPattern: /^https?:\/\/(www\.)?(drive|docs)\.google\.com\/(file\/d\/|drive\/folders\/|document\/d\/|spreadsheets\/d\/|presentation\/d\/).+$/,
    placeholder: 'https://drive.google.com/file/d/...',
    example: 'https://drive.google.com/file/d/1ABC...xyz/view',
    helpText: 'Share your file/folder and paste the link'
  },
  figma: {
    name: 'Figma',
    icon: '🎨',
    urlPattern: /^https?:\/\/(www\.)?figma\.com\/(file|proto|design)\/[\w-]+\/.+$/,
    placeholder: 'https://figma.com/file/...',
    example: 'https://figma.com/file/ABC123/My-Design',
    helpText: 'Share your Figma file and paste the link'
  },
  codepen: {
    name: 'CodePen',
    icon: '🖊️',
    urlPattern: /^https?:\/\/(www\.)?codepen\.io\/[\w-]+\/(pen|full)\/[\w-]+\/?.*$/,
    placeholder: 'https://codepen.io/username/pen/...',
    example: 'https://codepen.io/username/pen/abcXYZ',
    helpText: 'Share your CodePen and paste the link'
  },
  replit: {
    name: 'Replit',
    icon: '🔧',
    urlPattern: /^https?:\/\/(www\.)?replit\.com\/@[\w-]+\/[\w-]+\/?.*$/,
    placeholder: 'https://replit.com/@username/project-name',
    example: 'https://replit.com/@username/my-repl',
    helpText: 'Share your Replit and paste the link'
  },
  vercel: {
    name: 'Vercel',
    icon: '▲',
    urlPattern: /^https?:\/\/[\w-]+\.vercel\.app\/?.*$/,
    placeholder: 'https://your-project.vercel.app',
    example: 'https://my-awesome-app.vercel.app',
    helpText: 'Enter your deployed Vercel app URL'
  },
  netlify: {
    name: 'Netlify',
    icon: '🌐',
    urlPattern: /^https?:\/\/[\w-]+\.netlify\.app\/?.*$/,
    placeholder: 'https://your-project.netlify.app',
    example: 'https://my-awesome-app.netlify.app',
    helpText: 'Enter your deployed Netlify app URL'
  },
  custom: {
    name: 'Custom URL',
    icon: '🔗',
    urlPattern: /^https?:\/\/.+$/,
    placeholder: 'https://your-project-url.com',
    example: 'https://example.com/my-project',
    helpText: 'Enter any valid URL for your project'
  }
};

export default function ProjectSubmissionForm({
  lessonId,
  lessonTitle,
  projectTitle,
  projectDescription,
  projectInstructions,
  projectPlatform,
  onSubmitSuccess
}: ProjectSubmissionFormProps) {
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [existingSubmission, setExistingSubmission] = useState<ExistingSubmission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Guard to prevent double-fetch in React Strict Mode/dev
  const checkExistingRanRef = useRef(false);

  // Get platform configuration
  const platformKey = (projectPlatform?.toLowerCase() || 'custom') as keyof typeof PLATFORMS;
  const platform = PLATFORMS[platformKey] || PLATFORMS.custom;

  // Check for existing submission on mount
  useEffect(() => {
    // Prevent double-fetch in React Strict Mode/dev by using a stable ref
    if (checkExistingRanRef.current) return;
    checkExistingRanRef.current = true;

    const checkExistingSubmission = async () => {
      try {
        const response = await fetch(`/api/project-submissions?lessonId=${lessonId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.submissions && data.submissions.length > 0) {
            const submission = data.submissions[0];
            setExistingSubmission(submission);
            // Pre-fill form if submission can be edited
            if (submission.status === 'submitted' || submission.status === 'resubmission_required') {
              setSubmissionUrl(submission.submission_link);
              setNotes(submission.metadata?.notes || '');
            }
          }
        }
      } catch (err) {
        console.error('Error checking existing submission:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingSubmission();
  }, [lessonId]);

  // Validate URL based on platform
  const validateUrl = (url: string): boolean => {
    if (!url.trim()) {
      setValidationError('Project URL is required');
      return false;
    }

    if (!platform.urlPattern.test(url)) {
      setValidationError(`Invalid ${platform.name} URL format. Example: ${platform.example}`);
      return false;
    }

    setValidationError('');
    return true;
  };

  // Handle URL change with real-time validation
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setSubmissionUrl(url);
    if (url.trim()) {
      validateUrl(url);
    } else {
      setValidationError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validate URL before submission
    if (!validateUrl(submissionUrl)) {
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Replace with actual API endpoint when project_submissions table is created
      const response = await fetch('/api/project-submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonId,
          submissionUrl,
          notes: notes.trim() || null,
          platform: projectPlatform || 'custom'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit project');
      }

      setSuccess(true);
      setSubmissionUrl('');
      setNotes('');
      
      // Note: We don't call onSubmitSuccess here because project submissions
      // need to be approved by an instructor before the lesson can be marked complete.
      // The lesson will be automatically completed when the instructor approves the submission.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <span className="ml-3 text-gray-600">Loading...</span>
          </div>
        </div>
      )}

      {/* Existing Submission Status */}
      {!isLoading && existingSubmission && (
        <div className={`rounded-lg border p-6 ${
          existingSubmission.status === 'approved' 
            ? 'bg-green-50 border-green-200' 
            : existingSubmission.status === 'rejected' 
            ? 'bg-red-50 border-red-200'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {existingSubmission.status === 'approved' && (
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {existingSubmission.status === 'rejected' && (
                <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              {(existingSubmission.status === 'submitted' || existingSubmission.status === 'pending_review') && (
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3 flex-1">
              <h4 className="text-sm font-semibold mb-1">
                {existingSubmission.status === 'approved' && '✅ Project Approved'}
                {existingSubmission.status === 'rejected' && '❌ Project Needs Revision'}
                {existingSubmission.status === 'resubmission_required' && '🔄 Resubmission Required'}
                {(existingSubmission.status === 'submitted' || existingSubmission.status === 'pending_review') && '⏳ Pending Review'}
              </h4>
              <p className="text-sm mb-2">
                Submitted: {new Date(existingSubmission.submitted_at).toLocaleDateString()}
              </p>
              <p className="text-sm font-medium break-all">
                Link: <a href={existingSubmission.submission_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {existingSubmission.submission_link}
                </a>
              </p>
              {existingSubmission.feedback && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm font-semibold mb-1">Instructor Feedback:</p>
                  <p className="text-sm">{existingSubmission.feedback}</p>
                </div>
              )}
              {existingSubmission.status === 'approved' && (
                <p className="mt-3 text-sm text-green-700">
                  🎉 Great work! Your project has been approved. This lesson is now complete.
                </p>
              )}
              {(existingSubmission.status === 'rejected' || existingSubmission.status === 'resubmission_required') && (
                <p className="mt-3 text-sm text-red-700">
                  Please review the feedback above and resubmit your project using the form below.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Don't show form if approved */}
      {existingSubmission?.status === 'approved' ? null : (
        <>
      {/* Project Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-100">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">
              {projectTitle || 'Project Submission'}
            </h3>
          </div>
        </div>
      </div>

      {/* Description */}
      {projectDescription && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
            Project Description
          </h4>
          <p className="text-gray-700">
            {projectDescription}
          </p>
        </div>
      )}

      {/* Instructions */}
      {projectInstructions && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Project Instructions
          </h4>
          <div 
            className="prose max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: projectInstructions }}
          />
        </div>
      )}

      {/* Submission Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="submissionUrl" className="text-gray-900 font-semibold flex items-center">
            <span className="text-xl mr-2">{platform.icon}</span>
            {platform.name} Project URL *
          </Label>
          <Input
            id="submissionUrl"
            type="url"
            value={submissionUrl}
            onChange={handleUrlChange}
            placeholder={`${platform.placeholder} - ${platform.helpText}`}
            className={`${validationError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'}`}
            required
            disabled={isSubmitting}
          />
          {validationError && (
            <p className="text-sm text-red-600 flex items-center mt-1">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {validationError}
            </p>
          )}
          {!validationError && submissionUrl && platform.urlPattern.test(submissionUrl) && (
            <p className="text-sm text-green-600 flex items-center mt-1">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Valid {platform.name} URL
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Example: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{platform.example}</code>
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes" className="text-gray-900 font-semibold flex items-center">
            <svg className="w-4 h-4 mr-1.5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            Additional Notes (Optional)
          </Label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional notes, comments, or context about your submission..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            rows={4}
            disabled={isSubmitting}
          />
          <p className="text-xs text-gray-500">
            Optional: Share details about your implementation, challenges faced, or features added
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-red-900">Submission Failed</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-green-900">Project Submitted Successfully! 🎉</h4>
                <p className="text-sm text-green-700 mt-1">
                  Your project has been submitted and is awaiting instructor review.
                </p>
                <p className="text-sm text-green-600 mt-2">
                  ℹ️ This lesson will be marked complete once your instructor approves your submission.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting || !!validationError}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
              Submitting Project...
            </span>
          ) : (
            <span className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
              </svg>
              Submit Project
            </span>
          )}
        </Button>

        <p className="text-xs text-center text-gray-500">
          Your submission will be pending until reviewed and approved by your instructor
        </p>
      </form>

      {/* Help Section */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <h5 className="text-sm font-semibold text-amber-900 mb-1">Submission Tips</h5>
            <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
              <li>Make sure your repository/project is public or shared properly</li>
              <li>Include a README file with project documentation</li>
              <li>Test your submission link before submitting</li>
              <li>You can resubmit if you need to make changes</li>
            </ul>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
