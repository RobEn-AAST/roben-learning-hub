'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { coursesService } from '@/services/coursesService';
import { courseInstructorService, type InstructorProfile } from '@/services/courseInstructorService';
import { uploadImageUrlToImgbb, uploadImageFileToImgbb } from '@/lib/imgbb';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CourseData {
  id: string;
  title: string;
  slug: string;
  description: string;
  cover_image: string | null;
  status: 'draft' | 'published' | 'archived';
  created_by: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

interface CourseInfoEditorProps {
  courseId: string;
  course: CourseData;
  onSave: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

interface FormData {
  title: string;
  slug: string;
  description: string;
  cover_image: string;
  status: 'draft' | 'published' | 'archived';
  instructor_ids: string[];
}

interface ValidationErrors {
  [field: string]: string;
}

// ---------------------------------------------------------------------------
// Slug helper (mirrors server-side logic)
// ---------------------------------------------------------------------------

function generateSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .trim() || 'course'
  );
}

// ---------------------------------------------------------------------------
// imgbb URL validator
// ---------------------------------------------------------------------------

function isImgbbUrl(url?: string | null): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    return host.includes('imgbb.com') || host === 'i.ibb.co' || host === 'i.imgbb.com' || host.endsWith('ibb.co');
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CourseInfoEditor({ courseId, course, onSave, onDirtyChange }: CourseInfoEditorProps) {
  // ---- State ----
  const [formData, setFormData] = useState<FormData>({
    title: course.title,
    slug: course.slug,
    description: course.description,
    cover_image: course.cover_image ?? '',
    status: course.status,
    instructor_ids: [],
  });

  // Snapshot for dirty tracking
  const [initialData, setInitialData] = useState<FormData>(formData);

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Slug edit state
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [slugValidating, setSlugValidating] = useState(false);

  // Cover image upload state
  const [imgbbUploading, setImgbbUploading] = useState(false);
  const [imgbbError, setImgbbError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [stagedBase64, setStagedBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

  // Instructors
  const [availableInstructors, setAvailableInstructors] = useState<InstructorProfile[]>([]);
  const [instructorsLoading, setInstructorsLoading] = useState(true);

  // ---- Load data on mount ----
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingData(true);
      try {
        // Load existing course instructors in parallel with available instructors
        const [courseInstructors, allInstructors] = await Promise.all([
          courseInstructorService.getCourseInstructors(courseId),
          courseInstructorService.getAvailableInstructors(),
        ]);

        if (cancelled) return;

        const instructorIds = courseInstructors.map((ci) => ci.instructor_id);

        setAvailableInstructors(allInstructors);
        setInstructorsLoading(false);

        const loaded: FormData = {
          title: course.title,
          slug: course.slug,
          description: course.description,
          cover_image: course.cover_image ?? '',
          status: course.status,
          instructor_ids: instructorIds,
        };

        setFormData(loaded);
        setInitialData(loaded);
      } catch (err) {
        console.error('Failed to load course info:', err);
        toast.error('Failed to load course data.');
        setInstructorsLoading(false);
        // Still set initial data from props
        const fromProps: FormData = {
          title: course.title,
          slug: course.slug,
          description: course.description,
          cover_image: course.cover_image ?? '',
          status: course.status,
          instructor_ids: [],
        };
        setFormData(fromProps);
        setInitialData(fromProps);
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    }

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // ---- Dirty tracking ----
  const isDirty = useCallback((): boolean => {
    return (
      formData.title !== initialData.title ||
      formData.slug !== initialData.slug ||
      formData.description !== initialData.description ||
      formData.cover_image !== initialData.cover_image ||
      formData.status !== initialData.status ||
      JSON.stringify([...formData.instructor_ids].sort()) !== JSON.stringify([...initialData.instructor_ids].sort())
    );
  }, [formData, initialData]);

  useEffect(() => {
    onDirtyChange(isDirty());
  }, [formData, initialData, isDirty, onDirtyChange]);

  // ---- Slug uniqueness check on blur ----
  const validateSlugUniqueness = async (slug: string) => {
    if (!slug || slug === initialData.slug) return; // unchanged, skip
    setSlugValidating(true);
    try {
      // Use admin API to check — we query by slug
      const response = await fetch(`/api/admin/courses?search=${encodeURIComponent(slug)}&limit=50`, {
        credentials: 'same-origin',
      });
      if (response.ok) {
        const data = await response.json();
        const match = (data.courses || []).find(
          (c: { id: string; slug: string }) => c.slug === slug && c.id !== courseId
        );
        if (match) {
          setErrors((prev) => ({ ...prev, slug: 'This slug is already in use by another course.' }));
        } else {
          setErrors((prev) => {
            const next = { ...prev };
            delete next.slug;
            return next;
          });
        }
      }
    } catch {
      // Silently ignore network errors for slug validation
    } finally {
      setSlugValidating(false);
    }
  };

  // ---- Validation ----
  const validate = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required.';
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug is required.';
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(formData.slug)) {
      newErrors.slug = 'Slug must be lowercase, contain only letters, numbers, and hyphens.';
    }

    if (formData.cover_image && formData.cover_image.trim() !== '' && !isImgbbUrl(formData.cover_image.trim())) {
      newErrors.cover_image = 'Cover image must be a direct imgbb URL (i.ibb.co or imgbb.com).';
    }

    if (!['draft', 'published', 'archived'].includes(formData.status)) {
      newErrors.status = 'Invalid status value.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ---- Field update helper ----
  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };

      // Auto-generate slug from title unless manually edited
      if (field === 'title' && !slugManuallyEdited) {
        next.slug = generateSlug(value as string);
      }

      return next;
    });

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // ---- Save handler ----
  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      await coursesService.updateCourse(courseId, {
        title: formData.title,
        slug: formData.slug,
        description: formData.description,
        cover_image: formData.cover_image.trim() || null,
        status: formData.status,
        instructor_ids: formData.instructor_ids,
      });

      // Update initial data snapshot so dirty resets
      setInitialData({ ...formData });
      toast.success('Course info saved.');
      onSave();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save course.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // ---- Cover image: file staging ----
  const processFile = async (file: File) => {
    setImgbbError(null);
    if (!file.type.startsWith('image/')) {
      setImgbbError('Please select an image file.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setImgbbError(`File too large. Max size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB.`);
      return;
    }

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      const { dataUrl, base64 } = await new Promise<{ dataUrl: string; base64: string }>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const idx = result.indexOf(',');
          resolve({ dataUrl: result, base64: result.slice(idx + 1) });
        };
        reader.onerror = () => reject(reader.error);
      });

      setPreviewDataUrl(dataUrl);
      setStagedBase64(base64);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to read file.';
      setImgbbError(msg);
    }
  };

  // ---- Cover image: upload staged to imgbb ----
  const uploadStagedImage = async () => {
    if (!stagedBase64) {
      setImgbbError('No image to upload.');
      return;
    }

    try {
      setImgbbError(null);
      setImgbbUploading(true);
      const res = await uploadImageFileToImgbb(stagedBase64);
      if (!res.ok) {
        setImgbbError(res.error || 'Upload failed.');
        return;
      }
      if (res.url) {
        updateField('cover_image', res.url);
        setStagedBase64(null);
        setPreviewDataUrl(null);
        toast.success('Image uploaded to imgbb.');
      }
    } catch (err: unknown) {
      setImgbbError(err instanceof Error ? err.message : 'Upload error.');
    } finally {
      setImgbbUploading(false);
    }
  };

  // ---- Cover image: import external URL to imgbb ----
  const handleUploadToImgbb = async () => {
    setImgbbError(null);
    const url = formData.cover_image?.trim();
    if (!url) {
      setImgbbError('Enter an image URL first.');
      return;
    }

    try {
      setImgbbUploading(true);
      const result = await uploadImageUrlToImgbb(url);
      if (!result.ok) {
        setImgbbError(result.error || 'Upload failed.');
        return;
      }
      if (result.url) {
        updateField('cover_image', result.url);
        toast.success('Image imported to imgbb.');
      }
    } catch (err: unknown) {
      setImgbbError(err instanceof Error ? err.message : 'Upload error.');
    } finally {
      setImgbbUploading(false);
    }
  };

  const clearStagedImage = () => {
    setPreviewDataUrl(null);
    setStagedBase64(null);
    setImgbbError(null);
  };

  // ---- Instructor toggle ----
  const toggleInstructor = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      instructor_ids: prev.instructor_ids.includes(id)
        ? prev.instructor_ids.filter((x) => x !== id)
        : [...prev.instructor_ids, id],
    }));
  };

  // ---- Render helpers ----
  const getInstructorName = (id: string) => {
    const inst = availableInstructors.find((i) => i.id === id);
    return inst ? `${inst.first_name} ${inst.last_name}`.trim() || inst.email : id;
  };

  // =========================================================================
  // Loading skeleton
  // =========================================================================
  if (loadingData) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  // =========================================================================
  // Form
  // =========================================================================
  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Course Info</h2>
          <p className="text-sm text-gray-500 mt-1">
            Edit the core details for this course.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || !isDirty()}
          className="flex items-center gap-2"
        >
          {saving ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save
            </>
          )}
        </Button>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="course-title">
          Title <span className="text-red-500">*</span>
        </Label>
        <Input
          id="course-title"
          value={formData.title}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="Enter course title"
          className={errors.title ? 'border-red-500' : ''}
        />
        {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
      </div>

      {/* Slug */}
      <div className="space-y-2">
        <Label htmlFor="course-slug">
          Slug <span className="text-red-500">*</span>
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="course-slug"
            value={formData.slug}
            onChange={(e) => {
              setSlugManuallyEdited(true);
              updateField('slug', e.target.value);
            }}
            onBlur={() => validateSlugUniqueness(formData.slug)}
            placeholder="course-slug"
            className={`font-mono text-sm ${errors.slug ? 'border-red-500' : ''}`}
          />
          {slugValidating && (
            <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          )}
        </div>
        {errors.slug ? (
          <p className="text-sm text-red-500">{errors.slug}</p>
        ) : (
          <p className="text-xs text-gray-400">
            URL-friendly identifier. Auto-generated from title unless you edit it manually.
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="course-description">Description</Label>
        <textarea
          id="course-description"
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Describe this course..."
          rows={4}
          className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.description ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
      </div>

      {/* Cover Image */}
      <div className="space-y-2">
        <Label htmlFor="course-cover">Cover Image</Label>

        {/* URL input */}
        <div className="flex gap-2">
          <Input
            id="course-cover"
            value={formData.cover_image}
            onChange={(e) => updateField('cover_image', e.target.value)}
            placeholder="https://i.ibb.co/your-image.jpg"
            type="url"
            className={`flex-1 ${errors.cover_image ? 'border-red-500' : ''}`}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUploadToImgbb}
            disabled={imgbbUploading || !formData.cover_image}
            className="shrink-0 whitespace-nowrap"
          >
            Import to imgbb
          </Button>
        </div>
        {errors.cover_image && <p className="text-sm text-red-500">{errors.cover_image}</p>}
        <p className="text-xs text-gray-400">
          Direct imgbb URLs only. Drag &amp; drop or browse below to upload an image.
        </p>

        {/* Current / staged preview */}
        {(formData.cover_image || previewDataUrl) && (
          <div className="mt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewDataUrl || formData.cover_image}
              alt="Cover preview"
              className="h-40 rounded-md border border-gray-200 object-cover"
            />
          </div>
        )}

        {/* Drag & drop / file picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) processFile(f);
            (e.target as HTMLInputElement).value = '';
          }}
        />

        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
          }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
          onDrop={async (e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer?.files?.[0];
            if (file) await processFile(file);
          }}
          className={`mt-2 flex h-36 cursor-pointer items-center justify-center rounded-md border-2 border-dashed text-center transition-colors ${
            dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
          }`}
        >
          {stagedBase64 ? (
            <div className="flex w-full items-center gap-4 px-4">
              {previewDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewDataUrl}
                  alt="Staged preview"
                  className="h-28 max-w-[50%] rounded-md object-contain"
                />
              )}
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); uploadStagedImage(); }}
                  disabled={imgbbUploading}
                >
                  {imgbbUploading ? 'Uploading...' : 'Use this photo'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={(e) => { e.stopPropagation(); clearStagedImage(); }}
                  disabled={imgbbUploading}
                >
                  Clear
                </Button>
              </div>
            </div>
          ) : (
            <div className="pointer-events-none flex flex-col items-center">
              <svg className="mb-2 h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium text-gray-600">Drag &amp; drop image here</span>
              <span className="text-xs text-gray-400">or click to browse &mdash; max 5 MB</span>
            </div>
          )}
        </div>

        {imgbbError && <p className="text-sm text-red-500">{imgbbError}</p>}
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => updateField('status', value as FormData['status'])}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">
              <span className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">Draft</Badge>
                <span className="text-gray-500">Visible to admins only</span>
              </span>
            </SelectItem>
            <SelectItem value="published">
              <span className="flex items-center gap-2">
                <Badge className="text-xs">Published</Badge>
                <span className="text-gray-500">Visible to everyone</span>
              </span>
            </SelectItem>
            <SelectItem value="archived">
              <span className="flex items-center gap-2">
                <Badge variant="destructive" className="text-xs">Archived</Badge>
                <span className="text-gray-500">Hidden from listings</span>
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        {errors.status && <p className="text-sm text-red-500">{errors.status}</p>}
      </div>

      {/* Instructors */}
      <div className="space-y-3 pt-4 border-t border-gray-200">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Assigned Instructors</h3>
          <p className="text-xs text-gray-400 mt-0.5">Manage who can teach this course.</p>
        </div>

        {/* Currently assigned instructors */}
        {formData.instructor_ids.length > 0 ? (
          <div className="space-y-2">
            {formData.instructor_ids.map((id) => {
              const inst = availableInstructors.find((i) => i.id === id);
              return (
                <div
                  key={id}
                  className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                      {(inst?.first_name?.charAt(0) || inst?.last_name?.charAt(0) || '?').toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        {inst ? `${inst.first_name} ${inst.last_name}`.trim() || inst.email : 'Loading...'}
                      </p>
                      {inst?.email && (
                        <p className="text-xs text-blue-600">{inst.email}</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleInstructor(id)}
                    className="rounded-md p-1.5 text-blue-400 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                    aria-label={`Remove instructor`}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic py-2">No instructors assigned yet.</p>
        )}

        {/* Add instructor section */}
        {instructorsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : availableInstructors.length === 0 ? (
          <p className="text-sm text-amber-600 bg-amber-50 rounded-md px-3 py-2">
            No instructors found. Create instructor accounts first.
          </p>
        ) : (
          <div className="space-y-2">
            <Label className="text-sm text-gray-600">Add an instructor</Label>
            <div className="max-h-40 overflow-y-auto rounded-md border border-gray-200 p-1">
              {availableInstructors
                .filter((inst) => !formData.instructor_ids.includes(inst.id))
                .map((inst) => (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => toggleInstructor(inst.id)}
                    className="flex w-full items-center gap-3 rounded-md p-2.5 text-left transition-colors hover:bg-blue-50 hover:text-blue-900"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                      {(inst.first_name?.charAt(0) || inst.last_name?.charAt(0) || '?').toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {`${inst.first_name} ${inst.last_name}`.trim() || inst.email}
                      </p>
                      <p className="truncate text-xs text-gray-500">{inst.email}</p>
                    </div>
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                ))
              }
              {availableInstructors.filter((inst) => !formData.instructor_ids.includes(inst.id)).length === 0 && (
                <p className="text-sm text-gray-400 italic p-2">All instructors already assigned.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CourseInfoEditor;
