'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface Video {
  id: string;
  lesson_id: string;
  provider: string;
  provider_video_id: string;
  url: string;
  duration_seconds: number;
  transcript?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  lesson_title?: string;
  module_title?: string;
  course_title?: string;
}

export interface CreateVideoData {
  lesson_id: string;
  provider: string;
  provider_video_id: string;
  url: string;
  duration_seconds: number;
  transcript?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateVideoData {
  lesson_id?: string;
  provider?: string;
  provider_video_id?: string;
  url?: string;
  duration_seconds?: number;
  transcript?: string;
  metadata?: Record<string, unknown>;
}

export interface VideoStats {
  total_videos: number;
  total_duration_hours: number;
  videos_by_provider: Record<string, number>;
  videos_with_questions: number;
  videos_with_transcript: number;
}

export interface Lesson {
  id: string;
  title: string;
  module_title?: string;
  course_title?: string;
}

interface ApiError {
  error: string;
  message?: string;
  missingFields?: string[];
  details?: string;
  hint?: string;
  code?: string;
}

// Query keys
export const videoKeys = {
  all: ['videos'] as const,
  lists: () => [...videoKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...videoKeys.lists(), filters] as const,
  details: () => [...videoKeys.all, 'detail'] as const,
  detail: (id: string) => [...videoKeys.details(), id] as const,
  stats: () => [...videoKeys.all, 'stats'] as const,
  lessons: () => ['lessons', 'list'] as const,
};

// Fetch functions
async function fetchVideos(): Promise<Video[]> {
  const response = await fetch('/api/admin/videos');
  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || error.error || 'Failed to fetch videos');
  }
  return response.json();
}

async function fetchVideoStats(): Promise<VideoStats> {
  const response = await fetch('/api/admin/videos/stats');
  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || error.error || 'Failed to fetch video stats');
  }
  return response.json();
}

async function fetchLessons(): Promise<Lesson[]> {
  const response = await fetch('/api/admin/videos/lessons');
  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || error.error || 'Failed to fetch lessons');
  }
  return response.json();
}

async function createVideo(data: CreateVideoData): Promise<Video> {
  const response = await fetch('/api/admin/videos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || error.error || 'Failed to create video');
  }
  
  return response.json();
}

async function updateVideo(id: string, data: UpdateVideoData): Promise<Video> {
  const response = await fetch(`/api/admin/videos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || error.error || 'Failed to update video');
  }
  
  return response.json();
}

async function deleteVideo(id: string): Promise<void> {
  const response = await fetch(`/api/admin/videos/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || error.error || 'Failed to delete video');
  }
}

// Hooks
export function useVideos() {
  return useQuery({
    queryKey: videoKeys.lists(),
    queryFn: fetchVideos,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}

export function useVideoStats() {
  return useQuery({
    queryKey: videoKeys.stats(),
    queryFn: fetchVideoStats,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useLessons() {
  return useQuery({
    queryKey: videoKeys.lessons(),
    queryFn: fetchLessons,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useCreateVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createVideo,
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: videoKeys.lists() });
      queryClient.invalidateQueries({ queryKey: videoKeys.stats() });
      toast.success('Video created successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create video');
      console.error('Create video error:', error);
    },
  });
}

export function useUpdateVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVideoData }) =>
      updateVideo(id, data),
    onSuccess: (data, variables) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: videoKeys.lists() });
      queryClient.invalidateQueries({ queryKey: videoKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: videoKeys.stats() });
      toast.success('Video updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update video');
      console.error('Update video error:', error);
    },
  });
}

export function useDeleteVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteVideo,
    onSuccess: () => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: videoKeys.lists() });
      queryClient.invalidateQueries({ queryKey: videoKeys.stats() });
      toast.success('Video deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete video');
      console.error('Delete video error:', error);
    },
  });
}
