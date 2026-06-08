'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  GripVertical,
  FileText,
  Video,
  HelpCircle,
  Package,
  Save,
  Settings,
  Loader2,
  Check,
  X,
  ChevronUp,
  Eye,
  EyeOff,
  AlertTriangle,
  Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { coursesService } from '@/services/coursesService';
import {
  useCreateModule,
  useUpdateCourse,
  queryKeys,
} from '@/hooks/useQueryCache';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
// Dynamic imports — only the active editor loads (1 of 4 at a time)
const ArticleEditor = dynamic(() => import('@/components/admin/ArticleEditor'));
const VideoEditor = dynamic(() => import('@/components/admin/VideoEditor').then(m => ({ default: m.VideoEditor })));
const QuizEditor = dynamic(() => import('@/components/admin/QuizEditor').then(m => ({ default: m.QuizEditor })));
const ProjectEditor = dynamic(() => import('@/components/admin/ProjectEditor').then(m => ({ default: m.ProjectEditor })));
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ============================================================================
// Types
// ============================================================================

interface LessonContent {
  article?: any;
  video?: any;
  quiz?: any;
  project?: any;
}

interface Lesson {
  id: string;
  module_id: string;
  title: string;
  lesson_type: 'video' | 'article' | 'quiz' | 'project';
  position: number;
  status: 'visible' | 'hidden';
  instructor_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  content: LessonContent;
}

interface Module {
  id: string;
  course_id: string;
  title: string;
  description: string;
  position: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  lessons: Lesson[];
}

interface CourseData {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover_image: string | null;
  status: 'draft' | 'published' | 'archived';
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface CourseBuilderProps {
  course: CourseData;
  modules: Module[];
  currentUserId: string;
  mode?: 'admin' | 'instructor';
}

type SelectedItemType = 'course' | 'lesson';

// Status badge color map
const statusColors: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  published: 'bg-green-100 text-green-800 border-green-200',
  archived: 'bg-gray-100 text-gray-600 border-gray-200',
};

// Lesson type config
const lessonTypeConfig: Record<
  string,
  { icon: typeof Video; label: string; color: string }
> = {
  video: { icon: Video, label: 'Video', color: 'text-blue-500' },
  article: { icon: FileText, label: 'Article', color: 'text-emerald-500' },
  quiz: { icon: HelpCircle, label: 'Quiz', color: 'text-purple-500' },
  project: { icon: Package, label: 'Project', color: 'text-orange-500' },
};

// ============================================================================
// CourseBuilder Component
// ============================================================================

export function CourseBuilder({
  course: initialCourse,
  modules: initialModules,
  currentUserId,
  mode = 'admin',
}: CourseBuilderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = createClient();

  // Core state
  const [course, setCourse] = useState(initialCourse);
  const [modules, setModules] = useState(initialModules);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemType, setSelectedItemType] =
    useState<SelectedItemType>('course');

  // Dirty tracking
  const [dirty, setDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Delete confirmation dialog state
  const [pendingDelete, setPendingDelete] = useState<{
    lessonId: string;
    lessonTitle: string;
    moduleTitle: string;
    items: string[];
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Undo confirmation dialog state
  const [showUndoDialog, setShowUndoDialog] = useState(false);

  // Content editor dirty tracking
  const [contentDirty, setContentDirty] = useState(false);
  const editorSaveRef = useRef<(() => Promise<void>) | null>(null);
  const editorUndoRef = useRef<(() => void) | null>(null);
  const [floatingSaving, setFloatingSaving] = useState(false);
  const registerEditorSave = useCallback((fn: (() => Promise<void>) | null) => {
    editorSaveRef.current = fn;
    if (!fn) setContentDirty(false);
  }, []);
  const registerEditorUndo = useCallback((fn: (() => void) | null) => {
    editorUndoRef.current = fn;
  }, []);

  // beforeunload — warn before leaving with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty || contentDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty, contentDirty]);

  // Course info editor state
  const [courseForm, setCourseForm] = useState({
    title: initialCourse.title,
    description: initialCourse.description,
    cover_image: initialCourse.cover_image || '',
    status: initialCourse.status,
    instructor_ids: [] as string[],
  });

  // Available instructors for assignment
  const [availableInstructors, setAvailableInstructors] = useState<Array<{
    id: string; first_name: string; last_name: string; email: string;
  }>>([]);
  const [instructorsLoaded, setInstructorsLoaded] = useState(false);

  // Load instructors + existing assignments once
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [assignedRes, availableRes] = await Promise.all([
          fetch('/api/admin/course-instructors?type=course&courseId=' + course.id),
          fetch('/api/admin/course-instructors?type=available'),
        ]);
        const assignedData = await assignedRes.json();
        const availableData = await availableRes.json();

        if (cancelled) return;

        const assignedIds: string[] = (assignedData.instructors || assignedData || []).map((ci: any) => ci.instructor_id || ci.id);
        const instructors = availableData.instructors || [];

        setAvailableInstructors(instructors);
        setCourseForm(prev => ({ ...prev, instructor_ids: assignedIds }));
        setInstructorsLoaded(true);
      } catch {
        setInstructorsLoaded(true);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [course.id]);

  // Lesson editor state
  const [lessonForm, setLessonForm] = useState<{
    title: string;
    status: 'visible' | 'hidden';
  } | null>(null);

  // UI state for inline forms
  const [addingModule, setAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [addingLessonToModule, setAddingLessonToModule] = useState<
    string | null
  >(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonType, setNewLessonType] = useState<
    'video' | 'article' | 'quiz' | 'project'
  >('article');

  // Expand/collapse state
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(initialModules.map((m) => m.id))
  );

  // Mutations
  const updateCourseMutation = useUpdateCourse();

  // Select course info
  const selectCourseInfo = useCallback(() => {
    setSelectedItemId(null);
    setSelectedItemType('course');
    setLessonForm(null);
    setCourseForm({
      title: course.title,
      description: course.description,
      cover_image: course.cover_image || '',
      status: course.status,
    });
  }, [course]);

  // Select a lesson
  const selectLesson = useCallback((lesson: Lesson) => {
    setSelectedItemId(lesson.id);
    setSelectedItemType('lesson');
    setLessonForm({
      title: lesson.title,
      status: lesson.status,
    });
  }, []);

  // Get selected lesson data
  const getSelectedLesson = useCallback((): Lesson | null => {
    if (selectedItemType !== 'lesson' || !selectedItemId) return null;
    for (const mod of modules) {
      const found = mod.lessons.find((l) => l.id === selectedItemId);
      if (found) return found;
    }
    return null;
  }, [modules, selectedItemId, selectedItemType]);

  // Toggle module expand
  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  // ---- Course info changes ----
  const handleCourseFormChange = (
    field: string,
    value: string
  ) => {
    setCourseForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  // ---- Lesson form changes ----
  const handleLessonFormChange = (field: string, value: string) => {
    setLessonForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  // ---- Save handler ----
  const handleSave = useCallback(async () => {
    try {
      if (selectedItemType === 'course') {
        await updateCourseMutation.mutateAsync({
          id: course.id,
          updates: {
            title: courseForm.title,
            description: courseForm.description,
            cover_image: courseForm.cover_image || null,
            status: courseForm.status,
            instructor_ids: courseForm.instructor_ids,
          },
        });
        setCourse((prev) => ({
          ...prev,
          title: courseForm.title,
          description: courseForm.description,
          cover_image: courseForm.cover_image || null,
          status: courseForm.status as CourseData['status'],
        }));
      } else if (selectedItemType === 'lesson' && selectedItemId && lessonForm) {
        const { error } = await supabase
          .from('lessons')
          .update({
            title: lessonForm.title,
            status: lessonForm.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedItemId);

        if (error) throw error;

        // Update local state
        setModules((prev) =>
          prev.map((mod) => ({
            ...mod,
            lessons: mod.lessons.map((l) =>
              l.id === selectedItemId
                ? { ...l, title: lessonForm.title, status: lessonForm.status }
                : l
            ),
          }))
        );
      }

      setDirty(false);
      setLastSaved(new Date());
      toast.success('Saved successfully');
    } catch (err) {
      toast.error(
        `Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  }, [
    selectedItemType,
    course.id,
    courseForm,
    selectedItemId,
    lessonForm,
    updateCourseMutation,
    supabase,
  ]);

  // ---- Floating bar save handler ----
  const handleFloatingSave = useCallback(async () => {
    if (floatingSaving) return;
    setFloatingSaving(true);
    try {
      if (selectedItemType === 'course') {
        await handleSave();
      } else if (editorSaveRef.current) {
        await editorSaveRef.current();
      }
    } finally {
      setFloatingSaving(false);
    }
  }, [selectedItemType, handleSave, floatingSaving]);

  // ---- Publish/Unpublish ----
  const handleTogglePublish = useCallback(async () => {
    try {
      const newStatus = course.status === 'published' ? 'draft' : 'published';
      await updateCourseMutation.mutateAsync({
        id: course.id,
        updates: { status: newStatus },
      });
      setCourse((prev) => ({ ...prev, status: newStatus as CourseData['status'] }));
      setCourseForm((prev) => ({ ...prev, status: newStatus as CourseData['status'] }));
      toast.success(
        newStatus === 'published' ? 'Course published' : 'Course unpublished'
      );
    } catch (err) {
      toast.error(
        `Failed to update status: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  }, [course.id, course.status, updateCourseMutation]);

  // ---- Discard changes ----
  const handleDiscard = () => {
    if (selectedItemType === 'course') {
      setCourseForm({
        title: course.title,
        description: course.description,
        cover_image: course.cover_image || '',
        status: course.status,
      });
    } else if (selectedItemType === 'lesson') {
      const lesson = getSelectedLesson();
      if (lesson) {
        setLessonForm({ title: lesson.title, status: lesson.status });
      }
    }
    setDirty(false);
  };

  // ---- Undo handler (called after user confirms) ----
  const handleUndo = useCallback(() => {
    if (selectedItemType === 'course') {
      // Revert course-level form to last saved
      setCourseForm({
        title: course.title,
        description: course.description,
        cover_image: course.cover_image || '',
        status: course.status,
      });
      setDirty(false);
    } else if (selectedItemType === 'lesson') {
      // Revert lesson title/status
      const lesson = getSelectedLesson();
      if (lesson) {
        setLessonForm({ title: lesson.title, status: lesson.status });
      }
      setDirty(false);
      // Also revert content editor via registered undo
      editorUndoRef.current?.();
    }
    setShowUndoDialog(false);
  }, [selectedItemType, course, getSelectedLesson]);

  // ---- Add Module ----
  const handleAddModule = async () => {
    if (!newModuleTitle.trim()) return;

    try {
      const position = modules.length + 1;
      const { data, error } = await supabase
        .from('modules')
        .insert({
          course_id: course.id,
          title: newModuleTitle.trim(),
          description: '',
          position,
          metadata: {},
        })
        .select()
        .single();

      if (error) throw error;

      const newModule: Module = {
        ...data,
        lessons: [],
      };

      setModules((prev) => [...prev, newModule]);
      setExpandedModules((prev) => new Set([...prev, newModule.id]));
      setNewModuleTitle('');
      setAddingModule(false);
      toast.success('Module added');
    } catch (err) {
      toast.error(
        `Failed to add module: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  };

  // ---- Delete Module ----
  const handleDeleteModule = async (moduleId: string) => {
    const mod = modules.find((m) => m.id === moduleId);
    if (!mod) return;

    if (mod.lessons.length > 0) {
      toast.error(
        'Cannot delete a module with lessons. Remove all lessons first.'
      );
      return;
    }

    if (!confirm(`Delete module "${mod.title}"?`)) return;

    try {
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', moduleId);
      if (error) throw error;

      setModules((prev) => prev.filter((m) => m.id !== moduleId));
      if (selectedItemType === 'course' || !selectedItemId) {
        // keep course info selected
      }
      toast.success('Module deleted');
    } catch (err) {
      toast.error(
        `Failed to delete module: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  };

  // ---- Add Lesson ----
  const handleAddLesson = async (moduleId: string) => {
    if (!newLessonTitle.trim()) return;

    try {
      const mod = modules.find((m) => m.id === moduleId);
      const position = (mod?.lessons.length || 0) + 1;

      const { data, error } = await supabase
        .from('lessons')
        .insert({
          module_id: moduleId,
          title: newLessonTitle.trim(),
          lesson_type: newLessonType,
          position,
          status: 'hidden',
          instructor_id: currentUserId,
          metadata: {},
        })
        .select()
        .single();

      if (error) throw error;

      const newLesson: Lesson = {
        ...data,
        content: {},
      };

      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId
            ? { ...m, lessons: [...m.lessons, newLesson] }
            : m
        )
      );
      setNewLessonTitle('');
      setAddingLessonToModule(null);
      toast.success('Lesson added');
    } catch (err) {
      toast.error(
        `Failed to add lesson: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  };

  // ---- Delete Lesson (opens confirmation dialog) ----
  const handleDeleteLesson = (lessonId: string, moduleTitle: string) => {
    const lesson = modules.flatMap((m) => m.lessons).find((l) => l.id === lessonId);
    if (!lesson) return;

    const willDelete: string[] = [];
    const c = lesson.content;

    if (lesson.lesson_type === 'article' && c?.article) {
      willDelete.push('Article content (text, formatting)');
    } else if (lesson.lesson_type === 'video' && c?.video) {
      willDelete.push('Video settings (URL, embed, transcript)');
    } else if (lesson.lesson_type === 'quiz' && c?.quiz) {
      willDelete.push('Quiz');
      willDelete.push('All questions and answer options');
      willDelete.push('Student quiz attempt records');
    } else if (lesson.lesson_type === 'project' && c?.project) {
      willDelete.push('Project settings (instructions, platform)');
      willDelete.push('Student project submissions');
    }
    willDelete.push('Student progress for this lesson');

    setPendingDelete({
      lessonId,
      lessonTitle: lesson.title,
      moduleTitle,
      items: willDelete,
    });
  };

  // ---- Confirm Delete (called by dialog) ----
  const confirmDeleteLesson = async () => {
    if (!pendingDelete) return;
    setDeleting(true);

    try {
      const lessonId = pendingDelete.lessonId;
      const lesson = modules.flatMap((m) => m.lessons).find((l) => l.id === lessonId);

      // Delete associated content explicitly (safe even if DB has CASCADE)
      if (lesson) {
        if (lesson.lesson_type === 'article') {
          await supabase.from('articles').delete().eq('lesson_id', lessonId);
        } else if (lesson.lesson_type === 'video') {
          await supabase.from('videos').delete().eq('lesson_id', lessonId);
        } else if (lesson.lesson_type === 'quiz') {
          const { data: quiz } = await supabase
            .from('quizzes')
            .select('id')
            .eq('lesson_id', lessonId)
            .maybeSingle();
          if (quiz) {
            const { data: questions } = await supabase
              .from('questions')
              .select('id')
              .eq('quiz_id', quiz.id);
            if (questions && questions.length > 0) {
              const qIds = questions.map((q: { id: string }) => q.id);
              await supabase.from('question_options').delete().in('question_id', qIds);
              await supabase.from('user_answers').delete().in('question_id', qIds);
            }
            await supabase.from('quiz_attempts').delete().eq('quiz_id', quiz.id);
            await supabase.from('questions').delete().eq('quiz_id', quiz.id);
            await supabase.from('quizzes').delete().eq('id', quiz.id);
          }
        } else if (lesson.lesson_type === 'project') {
          const { data: project } = await supabase
            .from('projects')
            .select('id')
            .eq('lesson_id', lessonId)
            .maybeSingle();
          if (project) {
            await supabase.from('project_submissions').delete().eq('project_id', project.id);
            await supabase.from('projects').delete().eq('id', project.id);
          }
        }
      }

      await supabase.from('lesson_progress').delete().eq('lesson_id', lessonId);

      const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
      if (error) throw error;

      setModules((prev) =>
        prev.map((m) => ({
          ...m,
          lessons: m.lessons.filter((l) => l.id !== lessonId),
        }))
      );

      if (selectedItemId === lessonId) {
        selectCourseInfo();
      }
      toast.success('Lesson deleted');
      setPendingDelete(null);
    } catch (err) {
      toast.error(
        `Failed to delete lesson: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setDeleting(false);
    }
  };

  // ---- Refresh content dot status (queries DB for real state after save) ----
  const refreshContentStatus = useCallback(
    async (lessonId: string, contentType: 'article' | 'video' | 'quiz' | 'project') => {
      const tableMap: Record<string, string> = {
        article: 'articles',
        video: 'videos',
        quiz: 'quizzes',
        project: 'projects',
      };
      const { data } = await supabase
        .from(tableMap[contentType])
        .select('id')
        .eq('lesson_id', lessonId)
        .maybeSingle();

      setModules((prev) =>
        prev.map((m) => ({
          ...m,
          lessons: m.lessons.map((l) => {
            if (l.id !== lessonId) return l;
            const updated = { ...l, content: { ...l.content } };
            if (data) {
              updated.content[contentType] = data;
            } else {
              delete updated.content[contentType];
            }
            return updated;
          }),
        }))
      );
    },
    [supabase]
  );

  // ---- Move Module Up/Down ----
  const moveModule = async (moduleId: string, direction: 'up' | 'down') => {
    const sortedModules = [...modules].sort((a, b) => a.position - b.position);
    const index = sortedModules.findIndex((m) => m.id === moduleId);

    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === sortedModules.length - 1)
    )
      return;

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const moduleA = sortedModules[index];
    const moduleB = sortedModules[swapIndex];

    // Swap positions
    const { error: errA } = await supabase
      .from('modules')
      .update({ position: moduleB.position })
      .eq('id', moduleA.id);
    const { error: errB } = await supabase
      .from('modules')
      .update({ position: moduleA.position })
      .eq('id', moduleB.id);

    if (errA || errB) {
      toast.error('Failed to reorder modules');
      return;
    }

    setModules((prev) => {
      const updated = [...prev];
      return updated.map((m) => {
        if (m.id === moduleA.id) return { ...m, position: moduleB.position };
        if (m.id === moduleB.id) return { ...m, position: moduleA.position };
        return m;
      });
    });
  };

  // ---- Move Lesson Up/Down within module ----
  const moveLesson = async (
    moduleId: string,
    lessonId: string,
    direction: 'up' | 'down'
  ) => {
    const mod = modules.find((m) => m.id === moduleId);
    if (!mod) return;

    const sortedLessons = [...mod.lessons].sort((a, b) => a.position - b.position);
    const index = sortedLessons.findIndex((l) => l.id === lessonId);

    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === sortedLessons.length - 1)
    )
      return;

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const lessonA = sortedLessons[index];
    const lessonB = sortedLessons[swapIndex];

    const { error: errA } = await supabase
      .from('lessons')
      .update({ position: lessonB.position })
      .eq('id', lessonA.id);
    const { error: errB } = await supabase
      .from('lessons')
      .update({ position: lessonA.position })
      .eq('id', lessonB.id);

    if (errA || errB) {
      toast.error('Failed to reorder lessons');
      return;
    }

    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== moduleId) return m;
        return {
          ...m,
          lessons: m.lessons.map((l) => {
            if (l.id === lessonA.id) return { ...l, position: lessonB.position };
            if (l.id === lessonB.id) return { ...l, position: lessonA.position };
            return l;
          }),
        };
      })
    );
  };

  // ---- Check if a lesson has all required content (queries DB for accuracy) ----
  const getMissingFields = async (lesson: Lesson): Promise<string[]> => {
    const missing: string[] = [];
    if (!lesson.title?.trim()) missing.push('Lesson title');

    if (lesson.lesson_type === 'article') {
      const { data } = await supabase.from('articles').select('content').eq('lesson_id', lesson.id).maybeSingle();
      if (!data?.content?.trim()) missing.push('Article content');
    } else if (lesson.lesson_type === 'video') {
      const { data } = await supabase.from('videos').select('url').eq('lesson_id', lesson.id).maybeSingle();
      if (!data?.url?.trim()) missing.push('Video URL');
    } else if (lesson.lesson_type === 'quiz') {
      const { data: quiz } = await supabase.from('quizzes').select('id').eq('lesson_id', lesson.id).maybeSingle();
      if (!quiz) {
        missing.push('Quiz (save the quiz first)');
      } else {
        const { count } = await supabase.from('questions').select('*', { count: 'exact', head: true }).eq('quiz_id', quiz.id);
        if (!count || count === 0) missing.push('At least one quiz question');
      }
    } else if (lesson.lesson_type === 'project') {
      const { data } = await supabase.from('projects').select('description, submission_instructions').eq('lesson_id', lesson.id).maybeSingle();
      if (!data?.description?.trim() && !data?.submission_instructions?.trim()) missing.push('Project description or instructions');
    }
    return missing;
  };

  // ---- Toggle lesson visibility (checks completeness before making visible) ----
  const handleToggleVisibility = async () => {
    if (!selectedLesson) return;
    const newStatus = lessonForm?.status === 'visible' ? 'hidden' : 'visible';

    if (newStatus === 'visible') {
      const missing = await getMissingFields(selectedLesson);
      if (missing.length > 0) {
        toast.error(`Cannot publish yet — missing: ${missing.join(', ')}`);
        return;
      }
    }

    handleLessonFormChange('status', newStatus);
    await supabase.from('lessons').update({ status: newStatus }).eq('id', selectedLesson.id);

    // Update local modules state so sidebar dot updates immediately
    setModules((prev) =>
      prev.map((m) => ({
        ...m,
        lessons: m.lessons.map((l) =>
          l.id === selectedLesson.id ? { ...l, status: newStatus as Lesson['status'] } : l
        ),
      }))
    );

    toast.success(newStatus === 'visible' ? 'Lesson is now visible to students' : 'Lesson hidden');
  };

  // Check if content exists for a lesson
  const hasContent = (lesson: Lesson): boolean => {
    const c = lesson.content;
    return !!(
      c.article ||
      c.video ||
      c.quiz ||
      c.project
    );
  };

  // Build a tooltip listing which content types are configured
  const contentTooltip = (lesson: Lesson): string => {
    const c = lesson.content;
    const parts: string[] = [];
    if (c?.article) parts.push('Article ✓');
    if (c?.video) parts.push('Video ✓');
    if (c?.quiz) parts.push('Quiz ✓');
    if (c?.project) parts.push('Project ✓');
    return parts.length > 0
      ? `Content: ${parts.join(', ')}`
      : 'No content yet — click to add';
  };

  // Selected lesson reference
  const selectedLesson = getSelectedLesson();

  return (
    <div className="flex h-[calc(100vh-3rem)] -m-6">
      {/* ================================================================ */}
      {/* LEFT PANEL - Curriculum Tree */}
      {/* ================================================================ */}
      <div className="w-72 min-w-[18rem] bg-white border-r border-gray-200 flex flex-col overflow-hidden">
        {/* Tree Header */}
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            Curriculum
          </h2>
        </div>

        {/* Tree Content - scrollable */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {/* Course Info Link */}
          <button
            onClick={selectCourseInfo}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedItemId === null && selectedItemType === 'course'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Settings className="h-4 w-4 shrink-0" />
            Course Info
          </button>

          <div className="my-2 border-t border-gray-100" />

          {/* Modules and Lessons */}
          {[...modules]
            .sort((a, b) => a.position - b.position)
            .map((mod) => {
              const isExpanded = expandedModules.has(mod.id);
              const sortedLessons = [...mod.lessons].sort(
                (a, b) => a.position - b.position
              );

              return (
                <div key={mod.id} className="mb-1">
                  {/* Module Header */}
                  <div className="group flex items-center gap-1 rounded-lg hover:bg-gray-50">
                    {/* Reorder arrows */}
                    <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                      <button
                        onClick={() => moveModule(mod.id, 'up')}
                        className="p-0 leading-none text-gray-400 hover:text-gray-600"
                        title="Move up"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => moveModule(mod.id, 'down')}
                        className="p-0 leading-none text-gray-400 hover:text-gray-600"
                        title="Move down"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Expand toggle */}
                    <button
                      onClick={() => toggleModule(mod.id)}
                      className="flex items-center gap-1.5 flex-1 px-2 py-1.5 text-sm font-medium text-gray-700 rounded-lg"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      )}
                      <span className="truncate">{mod.title}</span>
                      <span className="text-xs text-gray-400 ml-auto shrink-0">
                        {mod.lessons.length}
                      </span>
                    </button>

                    {/* Module actions */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mr-1">
                      <button
                        onClick={() => {
                          setAddingLessonToModule(mod.id);
                          setNewLessonTitle('');
                          setNewLessonType('article');
                          if (!isExpanded) toggleModule(mod.id);
                        }}
                        className="p-1 rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50"
                        title="Add lesson"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteModule(mod.id)}
                        className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
                        title="Delete module"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Lessons under module */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-5 mt-0.5 space-y-0.5">
                          {sortedLessons.map((lesson) => {
                            const typeConf =
                              lessonTypeConfig[lesson.lesson_type] ||
                              lessonTypeConfig.article;
                            const TypeIcon = typeConf.icon;
                            const isSelected = selectedItemId === lesson.id;

                            return (
                              <div
                                key={lesson.id}
                                className="group/lesson flex items-center gap-1"
                              >
                                {/* Lesson reorder */}
                                <div className="flex flex-col opacity-0 group-hover/lesson:opacity-100 transition-opacity">
                                  <button
                                    onClick={() =>
                                      moveLesson(mod.id, lesson.id, 'up')
                                    }
                                    className="p-0 leading-none text-gray-400 hover:text-gray-600"
                                  >
                                    <ChevronUp className="h-2.5 w-2.5" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      moveLesson(mod.id, lesson.id, 'down')
                                    }
                                    className="p-0 leading-none text-gray-400 hover:text-gray-600"
                                  >
                                    <ChevronDown className="h-2.5 w-2.5" />
                                  </button>
                                </div>

                                {/* Lesson button */}
                                <button
                                  onClick={() => selectLesson(lesson)}
                                  className={`flex items-center gap-1.5 flex-1 px-2 py-1 rounded-md text-sm transition-colors ${
                                    isSelected
                                      ? 'bg-blue-50 text-blue-700'
                                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                                  }`}
                                >
                                  <TypeIcon
                                    className={`h-3.5 w-3.5 shrink-0 ${typeConf.color}`}
                                  />
                                  <span className="truncate">
                                    {lesson.title}
                                  </span>
                                  {/* Visibility dot: green = visible, gray = hidden */}
                                  <span
                                    className={`ml-auto w-2 h-2 rounded-full shrink-0 ${
                                      lesson.status === 'visible' ? 'bg-green-400' : 'bg-gray-300'
                                    }`}
                                    title={lesson.status === 'visible' ? 'Visible to students' : 'Hidden from students'}
                                  />
                                </button>

                                {/* Lesson delete */}
                                <button
                                  onClick={() =>
                                    handleDeleteLesson(lesson.id, mod.title)
                                  }
                                  className="p-1 rounded text-gray-300 opacity-0 group-hover/lesson:opacity-100 hover:text-red-500 transition-all"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            );
                          })}

                          {/* Inline Add Lesson Form */}
                          {addingLessonToModule === mod.id && (
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 space-y-2"
                            >
                              <Input
                                placeholder="Lesson title"
                                value={newLessonTitle}
                                onChange={(e) =>
                                  setNewLessonTitle(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddLesson(mod.id);
                                  if (e.key === 'Escape') setAddingLessonToModule(null);
                                }}
                                className="h-8 text-sm"
                                autoFocus
                              />
                              <div className="flex items-center gap-2">
                                <select
                                  value={newLessonType}
                                  onChange={(e) =>
                                    setNewLessonType(
                                      e.target.value as Lesson['lesson_type']
                                    )
                                  }
                                  className="h-8 text-sm border rounded-md px-2 bg-white"
                                >
                                  <option value="article">Article</option>
                                  <option value="video">Video</option>
                                  <option value="quiz">Quiz</option>
                                  <option value="project">Project</option>
                                </select>
                                <Button
                                  size="sm"
                                  onClick={() => handleAddLesson(mod.id)}
                                  className="h-8 text-xs"
                                >
                                  Create
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setAddingLessonToModule(null)}
                                  className="h-8 text-xs"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

          {/* Add Module Form */}
          {addingModule ? (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200 space-y-2"
            >
              <Input
                placeholder="Module title"
                value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddModule();
                  if (e.key === 'Escape') setAddingModule(false);
                }}
                className="h-8 text-sm"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleAddModule}
                  className="h-8 text-xs"
                >
                  Create
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAddingModule(false)}
                  className="h-8 text-xs"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </motion.div>
          ) : null}
        </div>

        {/* Add Module Button at bottom */}
        <div className="border-t border-gray-100 p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setAddingModule(true);
              setNewModuleTitle('');
            }}
            className="w-full justify-start text-gray-500 hover:text-gray-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Module
          </Button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* RIGHT PANEL - Content Editor */}
      {/* ================================================================ */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        {/* ---- HEADER ---- */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
          {/* Back */}
          <button
            onClick={() => router.push(`/${mode === 'instructor' ? 'instructor' : 'admin'}/courses`)}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          {/* Title + status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {course.title}
              </h1>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[course.status]}`}
              >
                {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
              </span>
            </div>
          </div>

          {/* Last saved */}
          {lastSaved && (
            <span className="text-xs text-gray-400 hidden sm:block">
              Last saved at{' '}
              {lastSaved.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}

          {/* Publish toggle — admin only */}
          {mode === 'admin' && (
            <Button
              size="sm"
              variant={
                course.status === 'published' ? 'outline' : 'default'
              }
              onClick={handleTogglePublish}
              disabled={updateCourseMutation.isPending}
            >
              {course.status === 'published' ? 'Unpublish' : 'Publish'}
            </Button>
          )}
        </div>

        {/* ---- CONTENT AREA ---- */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {selectedItemType === 'course' ? (
              <motion.div
                key="course-info"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
              >
                <CourseInfoEditor
                  form={courseForm}
                  onChange={handleCourseFormChange}
                  mode={mode}
                  availableInstructors={availableInstructors}
                  instructorsLoaded={instructorsLoaded}
                  onToggleInstructor={async (id: string) => {
                    const newIds = courseForm.instructor_ids.includes(id)
                      ? courseForm.instructor_ids.filter(x => x !== id)
                      : [...courseForm.instructor_ids, id];

                    // Optimistically update UI
                    setCourseForm(prev => ({ ...prev, instructor_ids: newIds }));

                    // Immediately save to DB
                    try {
                      await updateCourseMutation.mutateAsync({
                        id: course.id,
                        updates: { instructor_ids: newIds },
                      });
                      toast.success(courseForm.instructor_ids.includes(id)
                        ? 'Instructor removed'
                        : 'Instructor assigned');
                    } catch {
                      // Revert on failure
                      setCourseForm(prev => ({ ...prev, instructor_ids: courseForm.instructor_ids }));
                      toast.error('Failed to update instructor assignment');
                    }
                  }}
                />
              </motion.div>
            ) : selectedLesson ? (
              <motion.div
                key={`lesson-${selectedLesson.id}`}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                {/* Lesson settings header */}
                <div className="max-w-3xl mx-auto">
                  <div className="flex items-center gap-2 mb-1">
                    {(() => {
                      const tc = lessonTypeConfig[selectedLesson.lesson_type] || lessonTypeConfig.article;
                      const TIcon = tc.icon;
                      return (
                        <span className={`flex items-center gap-1.5 text-sm font-medium ${tc.color}`}>
                          <TIcon className="h-4 w-4" />
                          {tc.label}
                        </span>
                      );
                    })()}
                  </div>
                  {/* Inline lesson title + visibility toggle */}
                  <div className="flex items-center gap-3">
                    <Input
                      value={lessonForm?.title || ''}
                      onChange={(e) => handleLessonFormChange('title', e.target.value)}
                      onBlur={async () => {
                        if (lessonForm && lessonForm.title !== selectedLesson.title) {
                          await supabase.from('lessons').update({ title: lessonForm.title }).eq('id', selectedLesson.id);
                          toast.success('Title saved');
                        }
                      }}
                      className="text-lg font-semibold border-0 px-0 shadow-none focus-visible:ring-0"
                      placeholder="Lesson title"
                    />
                    <button
                      onClick={handleToggleVisibility}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
                        lessonForm?.status === 'visible'
                          ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-500 border border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      {lessonForm?.status === 'visible' ? (
                        <><Eye className="h-3.5 w-3.5" /> Visible</>
                      ) : (
                        <><EyeOff className="h-3.5 w-3.5" /> Hidden</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Content editor based on lesson type */}
                {selectedLesson.lesson_type === 'article' && (
                  <ArticleEditor
                    lessonId={selectedLesson.id}
                    lesson={selectedLesson}
                    onSave={() => { refreshContentStatus(selectedLesson.id, 'article'); setLastSaved(new Date()); setContentDirty(false); }}
                    onDirtyChange={(d) => setContentDirty(d)}
                    registerSave={registerEditorSave}
                    registerUndo={registerEditorUndo}
                  />
                )}
                {selectedLesson.lesson_type === 'video' && (
                  <VideoEditor
                    lessonId={selectedLesson.id}
                    lesson={selectedLesson}
                    onSave={() => { refreshContentStatus(selectedLesson.id, 'video'); setLastSaved(new Date()); setContentDirty(false); }}
                    onDirtyChange={(d) => setContentDirty(d)}
                    registerSave={registerEditorSave}
                    registerUndo={registerEditorUndo}
                  />
                )}
                {selectedLesson.lesson_type === 'quiz' && (
                  <QuizEditor
                    lessonId={selectedLesson.id}
                    lesson={selectedLesson}
                    onSave={() => { refreshContentStatus(selectedLesson.id, 'quiz'); setLastSaved(new Date()); setContentDirty(false); }}
                    onDirtyChange={(d) => setContentDirty(d)}
                    registerSave={registerEditorSave}
                    registerUndo={registerEditorUndo}
                  />
                )}
                {selectedLesson.lesson_type === 'project' && (
                  <ProjectEditor
                    lessonId={selectedLesson.id}
                    lesson={selectedLesson}
                    onSave={() => { refreshContentStatus(selectedLesson.id, 'project'); setLastSaved(new Date()); setContentDirty(false); }}
                    onDirtyChange={(d) => setContentDirty(d)}
                    registerSave={registerEditorSave}
                    registerUndo={registerEditorUndo}
                  />
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Floating save bar */}
        <AnimatePresence>
          {(dirty || contentDirty) && (
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-gray-200 bg-white/95 backdrop-blur px-6 py-3 flex items-center justify-between"
            >
              <span className="text-sm text-gray-500">
                Unsaved changes
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowUndoDialog(true)}
                >
                  <Undo2 className="h-4 w-4 mr-1.5" />
                  Undo
                </Button>
                <Button size="sm" onClick={handleFloatingSave} disabled={floatingSaving}>
                  {floatingSaving ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-1.5" />
                  )}
                  {floatingSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ================================================================ */}
      {/* DELETE LESSON CONFIRMATION DIALOG */}
      {/* ================================================================ */}
      <Dialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-lg">
                  Delete &ldquo;{pendingDelete?.lessonTitle}&rdquo;?
                </DialogTitle>
                <DialogDescription>
                  This action cannot be undone. The following will be permanently deleted:
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-1.5 py-1">
            {pendingDelete?.items.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm text-gray-600 pl-14">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                {item}
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              onClick={() => setPendingDelete(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteLesson}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete Forever
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================ */}
      {/* UNDO CONFIRMATION DIALOG */}
      {/* ================================================================ */}
      <Dialog open={showUndoDialog} onOpenChange={setShowUndoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>
              This will revert all unsaved changes back to the last saved version.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowUndoDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleUndo}
            >
              <Undo2 className="h-4 w-4 mr-1.5" />
              Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CourseInfoEditor({
  form,
  onChange,
  mode = 'admin',
  availableInstructors = [],
  instructorsLoaded = false,
  onToggleInstructor,
}: {
  form: {
    title: string;
    description: string;
    cover_image: string;
    status: string;
    instructor_ids: string[];
  };
  onChange: (field: string, value: string) => void;
  mode?: 'admin' | 'instructor';
  availableInstructors?: Array<{ id: string; first_name: string; last_name: string; email: string }>;
  instructorsLoaded?: boolean;
  onToggleInstructor?: (id: string) => void;
}) {
  const isViewOnly = mode === 'instructor';
  const instructorIds = form.instructor_ids || [];
  const assignedInstructors = availableInstructors.filter(i => instructorIds.includes(i.id));
  const unassignedInstructors = availableInstructors.filter(i => !instructorIds.includes(i.id));

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        Course Information
        {isViewOnly && <span className="ml-3 text-sm font-normal text-gray-400">(view only)</span>}
      </h2>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label>Title</Label>
          {isViewOnly ? (
            <p className="text-sm text-gray-900 px-3 py-2 bg-gray-50 rounded-md">{form.title}</p>
          ) : (
            <Input
              value={form.title}
              onChange={(e) => onChange('title', e.target.value)}
              placeholder="Course title"
            />
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>Description</Label>
          {isViewOnly ? (
            <p className="text-sm text-gray-900 px-3 py-2 bg-gray-50 rounded-md whitespace-pre-wrap min-h-[2.5rem]">
              {form.description || <span className="text-gray-400 italic">No description</span>}
            </p>
          ) : (
            <textarea
              value={form.description}
              onChange={(e) => onChange('description', e.target.value)}
              placeholder="Course description"
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 resize-none"
            />
          )}
        </div>

        {/* Cover Image */}
        <div className="space-y-2">
          <Label>Cover Image</Label>
          {form.cover_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.cover_image}
              alt="Cover preview"
              className="w-48 h-28 object-cover rounded-lg border border-gray-200"
            />
          ) : (
            <p className="text-sm text-gray-400 italic">No cover image</p>
          )}
          {!isViewOnly && (
            <Input
              value={form.cover_image}
              onChange={(e) => onChange('cover_image', e.target.value)}
              placeholder="https://..."
            />
          )}
        </div>

        {/* Status — admin only */}
        {mode === 'admin' && (
          <div className="space-y-2">
            <Label>Status</Label>
            <select
              value={form.status}
              onChange={(e) => onChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        )}

        {/* Status display for instructor view */}
        {isViewOnly && (
          <div className="space-y-2">
            <Label>Status</Label>
            <p className="text-sm px-3 py-2 bg-gray-50 rounded-md">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                form.status === 'published' ? 'bg-green-100 text-green-700' :
                form.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                'bg-red-100 text-red-700'
              }`}>
                {form.status.charAt(0).toUpperCase() + form.status.slice(1)}
              </span>
            </p>
          </div>
        )}

        {/* Instructors */}
        <div className="space-y-3 pt-4 border-t border-gray-200">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Assigned Instructors</h3>
            {!isViewOnly && <p className="text-xs text-gray-400 mt-0.5">Manage who can teach this course.</p>}
          </div>

          {assignedInstructors.length > 0 ? (
            <div className="space-y-2">
              {assignedInstructors.map((inst) => (
                <div
                  key={inst.id}
                  className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                      {(inst.first_name?.charAt(0) || inst.last_name?.charAt(0) || '?').toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        {`${inst.first_name} ${inst.last_name}`.trim() || inst.email}
                      </p>
                      <p className="text-xs text-blue-600">{inst.email}</p>
                    </div>
                  </div>
                  {!isViewOnly && onToggleInstructor && (
                    <button
                      type="button"
                      onClick={() => onToggleInstructor(inst.id)}
                      className="rounded-md p-1.5 text-blue-400 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                      aria-label="Remove instructor"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic py-2">No instructors assigned yet.</p>
          )}

          {/* Add instructor — admin only */}
          {!isViewOnly && (
            !instructorsLoaded ? (
              <p className="text-sm text-gray-400">Loading instructors...</p>
            ) : unassignedInstructors.length > 0 ? (
              <div className="space-y-2">
                <Label className="text-sm text-gray-600">Add an instructor</Label>
                <div className="max-h-40 overflow-y-auto rounded-md border border-gray-200 p-1">
                  {unassignedInstructors.map((inst) => (
                    <button
                      key={inst.id}
                      type="button"
                      onClick={() => onToggleInstructor?.(inst.id)}
                      className="flex w-full items-center gap-3 rounded-md p-2.5 text-left transition-colors hover:bg-blue-50"
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
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">All instructors already assigned.</p>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// LessonEditor
// ============================================================================

function LessonEditor({
  lesson,
  form,
  onChange,
}: {
  lesson: Lesson;
  form: { title: string; status: 'visible' | 'hidden' } | null;
  onChange: (field: string, value: string) => void;
}) {
  const typeConf = lessonTypeConfig[lesson.lesson_type] || lessonTypeConfig.article;
  const TypeIcon = typeConf.icon;

  if (!form) return null;

  // Check content status
  const contentInfo = getContentTypeStatus(lesson);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Lesson type badge */}
      <div className="flex items-center gap-2 mb-6">
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${typeConf.color} bg-opacity-10 border`}
        >
          <TypeIcon className="h-3.5 w-3.5" />
          {typeConf.label}
        </div>
        <span className="text-sm text-gray-400">
          Position {lesson.position}
        </span>
      </div>

      {/* Lesson Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Lesson Settings
        </h2>

        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="lesson-title">Title</Label>
          <Input
            id="lesson-title"
            value={form.title}
            onChange={(e) => onChange('title', e.target.value)}
            placeholder="Lesson title"
          />
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="lesson-status">Visibility</Label>
          <select
            id="lesson-status"
            value={form.status}
            onChange={(e) => onChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>
      </div>

      {/* Content Status Card */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">
          Content Status
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {(['article', 'video', 'quiz', 'project'] as const).map((type) => {
            const conf = lessonTypeConfig[type];
            const Icon = conf.icon;
            const hasIt = !!lesson.content?.[type];

            return (
              <div
                key={type}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  hasIt
                    ? 'bg-green-50 border-green-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <Icon className={`h-4 w-4 ${hasIt ? 'text-green-600' : 'text-gray-400'}`} />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700">
                    {conf.label}
                  </div>
                  <div className="text-xs text-gray-400">
                    {hasIt ? 'Configured' : 'Not set up'}
                  </div>
                </div>
                {hasIt && <Check className="h-4 w-4 text-green-500" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lesson Metadata */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">
          Details
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Lesson ID</span>
            <p className="text-gray-700 font-mono text-xs mt-0.5">
              {lesson.id}
            </p>
          </div>
          <div>
            <span className="text-gray-400">Module</span>
            <p className="text-gray-700 mt-0.5">{lesson.module_id}</p>
          </div>
          <div>
            <span className="text-gray-400">Created</span>
            <p className="text-gray-700 mt-0.5">
              {new Date(lesson.created_at).toLocaleDateString()}
            </p>
          </div>
          <div>
            <span className="text-gray-400">Updated</span>
            <p className="text-gray-700 mt-0.5">
              {new Date(lesson.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper to get content type status summary
function getContentTypeStatus(lesson: Lesson) {
  return {
    hasArticle: !!lesson.content?.article,
    hasVideo: !!lesson.content?.video,
    hasQuiz: !!lesson.content?.quiz,
    hasProject: !!lesson.content?.project,
  };
}
