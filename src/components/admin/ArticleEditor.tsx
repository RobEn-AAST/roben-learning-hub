'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Save,
  Eye,
  EyeOff,
  Clock,
  FileText,
  Loader2,
  RotateCcw,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface LessonData {
  id: string;
  title: string;
  lesson_type: string;
  [key: string]: unknown;
}

interface ArticleData {
  id: string;
  lesson_id: string;
  title: string | null;
  content: string | null;
  summary: string | null;
  reading_time_minutes: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface ArticleEditorProps {
  lessonId: string;
  lesson: LessonData;
  onSave: () => void;
  onDirtyChange: (dirty: boolean) => void;
  registerSave?: (fn: (() => Promise<void>) | null) => void;
  registerUndo?: (fn: (() => void) | null) => void;
}

// ============================================================================
// Helpers
// ============================================================================

function estimateReadingTime(content: string): number {
  if (!content.trim()) return 0;
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

// ============================================================================
// ArticleEditor Component
// ============================================================================

export default function ArticleEditor({
  lessonId,
  lesson,
  onSave,
  onDirtyChange,
  registerSave,
  registerUndo,
}: ArticleEditorProps) {
  // Article state
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [readingTime, setReadingTime] = useState(0);
  const [autoReadingTime, setAutoReadingTime] = useState(0);
  const [readingTimeManuallySet, setReadingTimeManuallySet] = useState(false);

  // UI state
  const [showPreview, setShowPreview] = useState(false);
  const [dirty, setDirty] = useState(false);

  // ---- Load article data on mount ----
  useEffect(() => {
    let cancelled = false;

    async function loadArticle() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/admin/articles?lessonId=${encodeURIComponent(lessonId)}`
        );
        if (!res.ok) {
          // If 404, no article exists yet -- that is fine
          if (res.status !== 404) {
            throw new Error(`Failed to load article: ${res.statusText}`);
          }
          return;
        }
        const data: ArticleData | null = await res.json();

        if (data && !cancelled) {
          setArticle(data);
          setTitle(data.title ?? '');
          setContent(data.content ?? '');
          setSummary(data.summary ?? '');
          setReadingTime(data.reading_time_minutes ?? 0);
          setAutoReadingTime(estimateReadingTime(data.content ?? ''));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load article');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadArticle();
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  // ---- Recalculate auto reading time when content changes ----
  useEffect(() => {
    const calculated = estimateReadingTime(content);
    setAutoReadingTime(calculated);
    if (!readingTimeManuallySet) {
      setReadingTime(calculated);
    }
  }, [content, readingTimeManuallySet]);

  // ---- Track dirty state ----
  useEffect(() => {
    if (!article) {
      // New article: dirty if any field has content
      const isDirty = title !== '' || content !== '' || summary !== '';
      setDirty(isDirty);
    } else {
      // Existing article: dirty if anything changed
      const isDirty =
        title !== (article.title ?? '') ||
        content !== (article.content ?? '') ||
        summary !== (article.summary ?? '') ||
        readingTime !== (article.reading_time_minutes ?? 0);
      setDirty(isDirty);
    }
  }, [title, content, summary, readingTime, article]);

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  // ---- Handle manual reading time edit ----
  const handleReadingTimeChange = useCallback(
    (value: string) => {
      const num = parseInt(value, 10);
      setReadingTimeManuallySet(true);
      setReadingTime(isNaN(num) ? 0 : Math.max(0, num));
    },
    []
  );

  // ---- Reset reading time to auto-calculated ----
  const resetReadingTime = useCallback(() => {
    setReadingTimeManuallySet(false);
    setReadingTime(autoReadingTime);
  }, [autoReadingTime]);

  // ---- Save handler ----
  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);

    try {
      if (article) {
        // Update existing article
        const res = await fetch(`/api/admin/articles/${article.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title || null,
            content: content || null,
            summary: summary || null,
            reading_time_minutes: readingTime || 0,
          }),
        });

        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error || 'Failed to update article');
        }

        const updated = await res.json();
        setArticle(updated);
        toast.success('Article saved');
      } else {
        // Create new article
        const res = await fetch('/api/admin/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lesson_id: lessonId,
            title: title || lesson.title,
            content: content,
            summary: summary || null,
            reading_time_minutes: readingTime || estimateReadingTime(content),
          }),
        });

        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error || 'Failed to create article');
        }

        const created = await res.json();
        setArticle(created);
        toast.success('Article created');
      }

      setDirty(false);
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      toast.error(
        `Save failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setSaving(false);
    }
  }, [article, title, content, summary, readingTime, lessonId, lesson.title, onSave]);

  // ---- Keyboard shortcut: Ctrl/Cmd+S ----
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (dirty && !saving) {
          handleSave();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dirty, saving, handleSave]);

  // Register save function for parent (CourseBuilder floating bar)
  const saveFnRef = useRef(handleSave);
  saveFnRef.current = handleSave;
  useEffect(() => {
    registerSave?.(() => saveFnRef.current());
    return () => registerSave?.(null);
  }, [registerSave]);

  // ---- Undo: revert all form state back to last saved snapshot ----
  const handleUndo = useCallback(() => {
    if (article) {
      setTitle(article.title ?? '');
      setContent(article.content ?? '');
      setSummary(article.summary ?? '');
      setReadingTime(article.reading_time_minutes ?? 0);
      setReadingTimeManuallySet(false);
    } else {
      // New article: clear everything
      setTitle('');
      setContent('');
      setSummary('');
      setReadingTime(0);
      setReadingTimeManuallySet(false);
    }
  }, [article]);

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
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400 mr-2" />
        <span className="text-gray-500">Loading article...</span>
      </div>
    );
  }

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-emerald-500" />
          <h2 className="text-lg font-semibold text-gray-900">
            Article Editor
          </h2>
          {!article && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              New
            </span>
          )}
        </div>
        {!registerSave && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!dirty || saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            {saving ? 'Saving...' : 'Save'}
          </Button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* ---- Article Fields ---- */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="article-title">
            Title{' '}
            <span className="text-gray-400 font-normal text-xs">
              (defaults to lesson title)
            </span>
          </Label>
          <Input
            id="article-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={lesson.title}
          />
        </div>

        {/* Content with preview toggle */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="article-content">Content</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPreview((prev) => !prev)}
              className="text-xs"
            >
              {showPreview ? (
                <>
                  <EyeOff className="h-3.5 w-3.5 mr-1" />
                  Editor
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  Preview
                </>
              )}
            </Button>
          </div>

          {showPreview ? (
            <div className="border border-gray-200 rounded-lg min-h-[400px] p-6 overflow-y-auto max-h-[600px] bg-white">
              {content.trim() ? (
                <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-strong:text-gray-900 prose-code:text-pink-600 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-100">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight, rehypeRaw]}
                  >
                    {content}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <p>No content to preview. Write something in the editor first.</p>
                </div>
              )}
            </div>
          ) : (
            <textarea
              id="article-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your article content in Markdown..."
              rows={20}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 resize-y font-mono leading-relaxed min-h-[400px]"
            />
          )}

          {/* Word count bar */}
          <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
            <span>{wordCount} words</span>
            <span>
              ~{autoReadingTime} min read
              {readingTimeManuallySet && (
                <span className="text-amber-500 ml-1">(manual override)</span>
              )}
            </span>
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-2">
          <Label htmlFor="article-summary">
            Summary{' '}
            <span className="text-gray-400 font-normal text-xs">(optional)</span>
          </Label>
          <textarea
            id="article-summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Brief summary of the article..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 resize-none"
          />
        </div>

        {/* Reading Time */}
        <div className="space-y-2">
          <Label htmlFor="article-reading-time" className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-gray-400" />
            Reading Time (minutes)
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="article-reading-time"
              type="number"
              min={0}
              value={readingTime}
              onChange={(e) => handleReadingTimeChange(e.target.value)}
              className="w-32"
            />
            {readingTimeManuallySet && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetReadingTime}
                className="text-xs text-gray-500 hover:text-gray-700"
                title="Reset to auto-calculated value"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Auto ({autoReadingTime})
              </Button>
            )}
            {!readingTimeManuallySet && (
              <span className="text-xs text-gray-400">Auto-calculated from content</span>
            )}
          </div>
        </div>
      </div>

      {/* Metadata */}
      {article && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">
            Details
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Article ID</span>
              <p className="text-gray-700 font-mono text-xs mt-0.5">
                {article.id}
              </p>
            </div>
            <div>
              <span className="text-gray-400">Lesson ID</span>
              <p className="text-gray-700 font-mono text-xs mt-0.5">
                {lessonId}
              </p>
            </div>
            <div>
              <span className="text-gray-400">Created</span>
              <p className="text-gray-700 mt-0.5">
                {new Date(article.created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <span className="text-gray-400">Last Updated</span>
              <p className="text-gray-700 mt-0.5">
                {new Date(article.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
