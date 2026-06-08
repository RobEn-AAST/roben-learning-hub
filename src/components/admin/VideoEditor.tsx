'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Video, Link, Clock, FileText, Eye } from 'lucide-react';
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

// ============================================================================
// Types
// ============================================================================

interface VideoData {
  id?: string;
  lesson_id: string;
  provider: string;
  provider_video_id: string;
  url: string;
  duration_seconds: number;
  transcript?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

interface LessonContent {
  video?: VideoData | null;
  [key: string]: unknown;
}

interface LessonData {
  id: string;
  title: string;
  lesson_type: string;
  content: LessonContent;
  [key: string]: unknown;
}

interface VideoEditorProps {
  lessonId: string;
  lesson: LessonData;
  onSave: () => void;
  onDirtyChange: (dirty: boolean) => void;
  registerSave?: (fn: (() => Promise<void>) | null) => void;
  registerUndo?: (fn: (() => void) | null) => void;
}

type Provider = 'youtube' | 'vimeo' | 'other';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse a video URL to detect provider and extract the video ID.
 */
function parseVideoUrl(
  url: string
): { provider: Provider; videoId: string } | null {
  if (!url.trim()) return null;

  // YouTube patterns
  const ytWatch = url.match(
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
  );
  if (ytWatch) {
    return { provider: 'youtube', videoId: ytWatch[1] };
  }

  const ytShort = url.match(
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/
  );
  if (ytShort) {
    return { provider: 'youtube', videoId: ytShort[1] };
  }

  const ytEmbed = url.match(
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
  );
  if (ytEmbed) {
    return { provider: 'youtube', videoId: ytEmbed[1] };
  }

  // Vimeo patterns
  const vimeoStandard = url.match(
    /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/
  );
  if (vimeoStandard) {
    return { provider: 'vimeo', videoId: vimeoStandard[1] };
  }

  const vimeoPlayer = url.match(
    /(?:https?:\/\/)?player\.vimeo\.com\/video\/(\d+)/
  );
  if (vimeoPlayer) {
    return { provider: 'vimeo', videoId: vimeoPlayer[1] };
  }

  // Unrecognised URL
  return null;
}

/**
 * Convert seconds to MM:SS display string.
 */
function secondsToMMSS(seconds: number | null | undefined): string {
  if (seconds == null || isNaN(seconds)) return '';
  const totalSeconds = Math.max(0, Math.round(seconds));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Parse an MM:SS string back to seconds. Returns null on invalid input.
 */
function mmssToSeconds(value: string): number | null {
  if (!value.trim()) return null;
  const match = value.trim().match(/^(\d+):(\d{1,2})$/);
  if (!match) return null;
  const mins = parseInt(match[1], 10);
  const secs = parseInt(match[2], 10);
  if (secs > 59) return null;
  return mins * 60 + secs;
}

// ============================================================================
// VideoEditor Component
// ============================================================================

export function VideoEditor({
  lessonId,
  lesson,
  onSave,
  onDirtyChange,
  registerSave,
  registerUndo,
}: VideoEditorProps) {
  const existingVideo = lesson.content?.video ?? null;
  const isNew = !existingVideo?.id;

  // ---- Form state ----
  const [url, setUrl] = useState(existingVideo?.url ?? '');
  const [provider, setProvider] = useState<Provider>(
    (existingVideo?.provider as Provider) ?? 'youtube'
  );
  const [videoId, setVideoId] = useState(
    existingVideo?.provider_video_id ?? ''
  );
  const [durationDisplay, setDurationDisplay] = useState(
    secondsToMMSS(existingVideo?.duration_seconds)
  );
  const [transcript, setTranscript] = useState(
    existingVideo?.transcript ?? ''
  );

  // Track whether the video ID was manually edited (so auto-extract does not
  // overwrite the user's change).
  const [videoIdManuallyEdited, setVideoIdManuallyEdited] = useState(false);

  // ---- Saving state ----
  const [saving, setSaving] = useState(false);

  // ---- Dirty tracking ----
  const [initialValues] = useState(() => ({
    url: existingVideo?.url ?? '',
    provider: (existingVideo?.provider as Provider) ?? 'youtube',
    videoId: existingVideo?.provider_video_id ?? '',
    durationDisplay: secondsToMMSS(existingVideo?.duration_seconds),
    transcript: existingVideo?.transcript ?? '',
  }));

  const isDirty = useCallback((): boolean => {
    return (
      url !== initialValues.url ||
      provider !== initialValues.provider ||
      videoId !== initialValues.videoId ||
      durationDisplay !== initialValues.durationDisplay ||
      transcript !== initialValues.transcript
    );
  }, [url, provider, videoId, durationDisplay, transcript, initialValues]);

  // Notify parent when dirty state changes
  useEffect(() => {
    onDirtyChange(isDirty());
  }, [isDirty, onDirtyChange]);

  // ---- URL auto-detection ----
  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    const parsed = parseVideoUrl(newUrl);
    if (parsed) {
      setProvider(parsed.provider);
      if (!videoIdManuallyEdited) {
        setVideoId(parsed.videoId);
      }
    }
  };

  // ---- Provider manual override ----
  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider as Provider);
    // Re-extract video ID from URL with the new provider context
    if (url) {
      const parsed = parseVideoUrl(url);
      if (parsed) {
        setVideoId(parsed.videoId);
        setVideoIdManuallyEdited(false);
      }
    }
  };

  // ---- Video ID manual edit ----
  const handleVideoIdChange = (newVideoId: string) => {
    setVideoId(newVideoId);
    setVideoIdManuallyEdited(true);
  };

  // ---- Duration handling ----
  const handleDurationChange = (value: string) => {
    // Allow only digits and colon
    const sanitized = value.replace(/[^0-9:]/g, '');
    setDurationDisplay(sanitized);
  };

  const handleDurationBlur = () => {
    // On blur, normalise the display value
    const seconds = mmssToSeconds(durationDisplay);
    if (seconds !== null) {
      setDurationDisplay(secondsToMMSS(seconds));
    }
  };

  // ---- Preview URL ----
  const getPreviewUrl = (): string | null => {
    if (!provider || !videoId) return null;
    switch (provider) {
      case 'youtube':
        return `https://www.youtube.com/embed/${videoId}`;
      case 'vimeo':
        return `https://player.vimeo.com/video/${videoId}`;
      default:
        return url || null;
    }
  };

  // ---- Save handler ----
  const handleSave = async () => {
    const durationSeconds = mmssToSeconds(durationDisplay);

    // Validate URL is provided
    if (!url.trim()) {
      toast.error('Video URL is required');
      return;
    }

    // Validate provider + video ID
    if (!provider) {
      toast.error('Please select a video provider');
      return;
    }
    if (!videoId.trim()) {
      toast.error(
        'Video ID could not be auto-detected. Please enter it manually.'
      );
      return;
    }

    // Validate duration format
    if (durationDisplay.trim() && durationSeconds === null) {
      toast.error('Duration must be in MM:SS format (e.g. 12:34)');
      return;
    }

    const payload = {
      lesson_id: lessonId,
      url: url.trim(),
      provider,
      provider_video_id: videoId.trim(),
      duration_seconds: durationSeconds ?? 0,
      transcript: transcript.trim() || null,
    };

    setSaving(true);
    try {
      if (isNew) {
        const res = await fetch('/api/admin/videos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || err.error || 'Failed to create video');
        }
        toast.success('Video created');
      } else {
        const res = await fetch(`/api/admin/videos/${existingVideo!.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || err.error || 'Failed to update video');
        }
        toast.success('Video updated');
      }
      onSave();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save video'
      );
    } finally {
      setSaving(false);
    }
  };

  // Register save function for parent (CourseBuilder floating bar)
  const saveFnRef = useRef(handleSave);
  saveFnRef.current = handleSave;
  useEffect(() => {
    registerSave?.(() => saveFnRef.current());
    return () => registerSave?.(null);
  }, [registerSave]);

  // ---- Undo: revert all form state back to last saved snapshot ----
  const handleUndo = useCallback(() => {
    setUrl(initialValues.url);
    setProvider(initialValues.provider);
    setVideoId(initialValues.videoId);
    setDurationDisplay(initialValues.durationDisplay);
    setTranscript(initialValues.transcript);
    setVideoIdManuallyEdited(false);
  }, [initialValues]);

  // Register undo function for parent (CourseBuilder floating bar)
  const undoFnRef = useRef(handleUndo);
  undoFnRef.current = handleUndo;
  useEffect(() => {
    registerUndo?.(() => undoFnRef.current());
    return () => registerUndo?.(null);
  }, [registerUndo]);

  const previewUrl = getPreviewUrl();
  const parsedFromUrl = parseVideoUrl(url);
  const showProviderHint = url.trim() && parsedFromUrl;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-50 text-blue-600">
          <Video className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {isNew ? 'Add Video' : 'Edit Video'}
          </h3>
          <p className="text-sm text-gray-500">
            {isNew
              ? 'Configure the video for this lesson'
              : 'Update video settings and content'}
          </p>
        </div>
      </div>

      {/* Video URL */}
      <div className="space-y-2">
        <Label htmlFor="video-url" className="flex items-center gap-1.5">
          <Link className="h-3.5 w-3.5 text-gray-400" />
          Video URL
        </Label>
        <Input
          id="video-url"
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
        />
        {showProviderHint && (
          <p className="text-xs text-green-600">
            Detected: {parsedFromUrl.provider} (ID: {parsedFromUrl.videoId})
          </p>
        )}
      </div>

      {/* Provider + Video ID row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Provider */}
        <div className="space-y-2">
          <Label htmlFor="video-provider">Provider</Label>
          <Select value={provider} onValueChange={handleProviderChange}>
            <SelectTrigger id="video-provider" className="w-full">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="vimeo">Vimeo</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Video ID */}
        <div className="space-y-2">
          <Label htmlFor="video-id">Video ID</Label>
          <Input
            id="video-id"
            value={videoId}
            onChange={(e) => handleVideoIdChange(e.target.value)}
            placeholder="Auto-extracted from URL"
          />
        </div>
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <Label htmlFor="video-duration" className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-gray-400" />
          Duration
        </Label>
        <div className="relative w-40">
          <Input
            id="video-duration"
            value={durationDisplay}
            onChange={(e) => handleDurationChange(e.target.value)}
            onBlur={handleDurationBlur}
            placeholder="00:00"
            className="pr-12"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
            MM:SS
          </span>
        </div>
        <p className="text-xs text-gray-400">
          Enter duration in minutes:seconds format (e.g. 12:34)
        </p>
      </div>

      {/* Embed Preview */}
      {previewUrl && (
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5 text-gray-400" />
            Preview
          </Label>
          <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-gray-200 bg-gray-900">
            <iframe
              src={previewUrl}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Video preview"
            />
          </div>
        </div>
      )}

      {/* Transcript */}
      <div className="space-y-2">
        <Label htmlFor="video-transcript" className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-gray-400" />
          Transcript
          <span className="text-xs font-normal text-gray-400">(optional)</span>
        </Label>
        <textarea
          id="video-transcript"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Paste or write the video transcript here..."
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 resize-none"
        />
      </div>

      {/* Save Button */}
      {!registerSave && (
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {isNew ? 'Create Video' : 'Save Changes'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setUrl(initialValues.url);
              setProvider(initialValues.provider);
              setVideoId(initialValues.videoId);
              setDurationDisplay(initialValues.durationDisplay);
              setTranscript(initialValues.transcript);
              setVideoIdManuallyEdited(false);
            }}
            disabled={saving}
          >
            Reset
          </Button>
        </div>
      )}
    </div>
  );
}
