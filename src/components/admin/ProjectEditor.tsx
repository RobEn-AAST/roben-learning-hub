'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Package, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { SubmissionPlatform, Project } from '@/types/project';
import { PLATFORM_NAMES } from '@/types/project';

// ============================================================================
// Types
// ============================================================================

interface LessonData {
  id: string;
  title: string;
  lesson_type: string;
  content: {
    project?: Project | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface ProjectEditorProps {
  lessonId: string;
  lesson: LessonData;
  onSave: () => void;
  onDirtyChange: (dirty: boolean) => void;
  registerSave?: (fn: (() => Promise<void>) | null) => void;
  registerUndo?: (fn: (() => void) | null) => void;
}

interface ProjectFormState {
  title: string;
  description: string;
  submission_instructions: string;
  submission_platform: SubmissionPlatform | '';
}

const SUBMISSION_PLATFORMS: SubmissionPlatform[] = [
  'github',
  'gitlab',
  'bitbucket',
  'google_drive',
  'onedrive',
  'dropbox',
  'other',
];

const TEXTAREA_CLASS =
  'w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 resize-none';

// ============================================================================
// ProjectEditor Component
// ============================================================================

export function ProjectEditor({
  lessonId,
  lesson,
  onSave,
  onDirtyChange,
  registerSave,
  registerUndo,
}: ProjectEditorProps) {
  // Existing project from lesson content (may be null if not yet created)
  const existingProject = lesson.content?.project ?? null;

  const [project, setProject] = useState<Project | null>(existingProject);
  const [form, setForm] = useState<ProjectFormState>({
    title: existingProject?.title ?? '',
    description: existingProject?.description ?? '',
    submission_instructions: existingProject?.submission_instructions ?? '',
    submission_platform: existingProject?.submission_platform ?? '',
  });
  const [initialForm, setInitialForm] = useState<ProjectFormState>({ ...form });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Fetch project by lesson_id if not in lesson.content ----
  useEffect(() => {
    if (existingProject) {
      setProject(existingProject);
      const state = formFromProject(existingProject);
      setForm(state);
      setInitialForm(state);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const res = await fetch(
          `/api/admin/projects/lessons?lesson_id=${encodeURIComponent(lessonId)}`
        );
        if (!res.ok) {
          if (res.status !== 404) throw new Error('Failed to fetch project');
          // No project exists yet - that is fine
          return;
        }
        const data = await res.json();
        if (!cancelled && data) {
          setProject(data);
          const state = formFromProject(data);
          setForm(state);
          setInitialForm(state);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load project'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Only run when lessonId changes or on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  // ---- Dirty tracking ----
  const isDirty = useCallback(
    (current: ProjectFormState, initial: ProjectFormState) => {
      return (
        current.title !== initial.title ||
        current.description !== initial.description ||
        current.submission_instructions !== initial.submission_instructions ||
        current.submission_platform !== initial.submission_platform
      );
    },
    []
  );

  useEffect(() => {
    onDirtyChange(isDirty(form, initialForm));
  }, [form, initialForm, isDirty, onDirtyChange]);

  // ---- Form handlers ----
  const updateField = <K extends keyof ProjectFormState>(
    field: K,
    value: ProjectFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ---- Save ----
  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);

    try {
      const payload = {
        lesson_id: lessonId,
        title: form.title || lesson.title,
        description: form.description,
        submission_instructions: form.submission_instructions || null,
        submission_platform: form.submission_platform || null,
      };

      let savedProject: Project;

      if (project?.id) {
        // Update existing
        const res = await fetch(`/api/admin/projects/${project.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to update project');
        }
        savedProject = await res.json();
      } else {
        // Create new
        const res = await fetch('/api/admin/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to create project');
        }
        savedProject = await res.json();
      }

      setProject(savedProject);
      const newState = formFromProject(savedProject);
      setForm(newState);
      setInitialForm(newState);
      onSave();
      toast.success(
        project?.id ? 'Project updated' : 'Project created'
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to save project';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }, [form, lesson.title, lessonId, onSave, project]);

  // Register save function for parent (CourseBuilder floating bar)
  const saveFnRef = useRef(handleSave);
  saveFnRef.current = handleSave;
  useEffect(() => {
    registerSave?.(() => saveFnRef.current());
    return () => registerSave?.(null);
  }, [registerSave]);

  // ---- Undo: revert form back to last saved snapshot ----
  const handleUndo = useCallback(() => {
    setForm({ ...initialForm });
  }, [initialForm]);

  // Register undo function for parent (CourseBuilder floating bar)
  const undoFnRef = useRef(handleUndo);
  undoFnRef.current = handleUndo;
  useEffect(() => {
    registerUndo?.(() => undoFnRef.current());
    return () => registerUndo?.(null);
  }, [registerUndo]);

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">
          Loading project data...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-orange-500 bg-orange-50 border border-orange-200">
          <Package className="h-3.5 w-3.5" />
          Project
        </div>
        <span className="text-sm text-gray-400">
          {project?.id ? 'Edit project settings' : 'Configure project'}
        </span>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Project Details
        </h3>

        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="project-title">
            Title{' '}
            <span className="text-xs text-gray-400 font-normal">
              (defaults to lesson title if empty)
            </span>
          </Label>
          <Input
            id="project-title"
            value={form.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder={lesson.title}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="project-description">
            Description{' '}
            <span className="text-xs text-gray-400 font-normal">
              (optional)
            </span>
          </Label>
          <textarea
            id="project-description"
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Describe what students need to build or submit..."
            rows={4}
            className={TEXTAREA_CLASS}
          />
        </div>

        {/* Submission Instructions */}
        <div className="space-y-2">
          <Label htmlFor="project-submission-instructions">
            Submission Instructions{' '}
            <span className="text-xs text-gray-400 font-normal">
              (optional)
            </span>
          </Label>
          <textarea
            id="project-submission-instructions"
            value={form.submission_instructions}
            onChange={(e) =>
              updateField('submission_instructions', e.target.value)
            }
            placeholder="How should students submit their work? Include any formatting requirements, file naming conventions, etc."
            rows={4}
            className={TEXTAREA_CLASS}
          />
        </div>

        {/* Submission Platform */}
        <div className="space-y-2">
          <Label htmlFor="project-submission-platform">
            Submission Platform
          </Label>
          <Select
            value={form.submission_platform || undefined}
            onValueChange={(value: string) =>
              updateField(
                'submission_platform',
                value as SubmissionPlatform | ''
              )
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a platform" />
            </SelectTrigger>
            <SelectContent>
              {SUBMISSION_PLATFORMS.map((platform) => (
                <SelectItem key={platform} value={platform}>
                  {PLATFORM_NAMES[platform]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Save Button */}
      {!registerSave && (
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setForm({ ...initialForm });
            }}
            disabled={saving || !isDirty(form, initialForm)}
          >
            Discard
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !isDirty(form, initialForm)}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : project?.id ? (
              'Update Project'
            ) : (
              'Create Project'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formFromProject(project: Project | null): ProjectFormState {
  return {
    title: project?.title ?? '',
    description: project?.description ?? '',
    submission_instructions: project?.submission_instructions ?? '',
    submission_platform: project?.submission_platform ?? '',
  };
}
