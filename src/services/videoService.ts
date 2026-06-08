import { createClient } from '@/lib/supabase/client';

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
  // Join fields
  lesson_title?: string;
  module_title?: string;
  course_title?: string;
}

export interface VideoQuestion {
  id: string;
  video_id: string;
  question: string;
  timestamp_seconds: number;
  created_at: string;
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

export interface CreateVideoQuestionData {
  video_id: string;
  question: string;
  timestamp_seconds: number;
}

export interface UpdateVideoQuestionData {
  question?: string;
  timestamp_seconds?: number;
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

class VideoService {
  private supabase = createClient();

  async getVideoStats(): Promise<VideoStats> {
    try {
      const { data: videosData, error: videosError } = await this.supabase
        .from('videos')
        .select('duration_seconds, provider, transcript');

      if (videosError) throw new Error(`Failed to fetch videos: ${videosError.message}`);

      let videosWithQuestions = 0;
      try {
        const { data: questionsData, error: questionsError } = await this.supabase
          .from('video_questions')
          .select('video_id');
        if (!questionsError && questionsData) {
          const uniqueVideoIds = new Set(questionsData.map(q => q.video_id));
          videosWithQuestions = uniqueVideoIds.size;
        }
      } catch { /* table may not exist */ }

      const totalVideos = videosData?.length || 0;
      const totalDurationSeconds = videosData?.reduce((sum, v) => sum + (v.duration_seconds || 0), 0) || 0;
      const totalDurationHours = Math.round((totalDurationSeconds / 3600) * 100) / 100;
      const videosByProvider = videosData?.reduce((acc, v) => {
        acc[v.provider] = (acc[v.provider] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};
      const videosWithTranscript = videosData?.filter(v => v.transcript).length || 0;

      return { total_videos: totalVideos, total_duration_hours: totalDurationHours, videos_by_provider: videosByProvider, videos_with_questions: videosWithQuestions, videos_with_transcript: videosWithTranscript };
    } catch (error) {
      console.error('Error getting video stats:', error);
      throw error;
    }
  }

  async getAllVideos(): Promise<Video[]> {
    const { data, error } = await this.supabase
      .from('videos')
      .select(`*, lessons!inner(title, modules!inner(title, courses!inner(title)))`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data?.map(v => ({ ...v, lesson_title: v.lessons?.title, module_title: v.lessons?.modules?.title, course_title: v.lessons?.modules?.courses?.title })) || [];
  }

  async getVideoById(id: string): Promise<Video | null> {
    const { data, error } = await this.supabase
      .from('videos')
      .select(`*, lessons!inner(title, modules!inner(title, courses!inner(title)))`)
      .eq('id', id).single();
    if (error) throw error;
    if (!data) return null;
    return { ...data, lesson_title: data.lessons?.title, module_title: data.lessons?.modules?.title, course_title: data.lessons?.modules?.courses?.title };
  }

  async createVideo(videoData: CreateVideoData): Promise<Video> {
    const { data, error } = await this.supabase.from('videos').insert([videoData]).select().single();
    if (error) throw error;
    return data;
  }

  async updateVideo(id: string, videoData: UpdateVideoData): Promise<Video> {
    const { data, error } = await this.supabase
      .from('videos')
      .update({ ...videoData, updated_at: new Date().toISOString() })
      .eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async deleteVideo(id: string): Promise<void> {
    await this.supabase.from('video_questions').delete().eq('video_id', id);
    const { error } = await this.supabase.from('videos').delete().eq('id', id);
    if (error) throw error;
  }

  async getVideoQuestions(videoId: string): Promise<VideoQuestion[]> {
    const { data, error } = await this.supabase.from('video_questions').select('*').eq('video_id', videoId).order('timestamp_seconds', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async createVideoQuestion(questionData: CreateVideoQuestionData): Promise<VideoQuestion> {
    const { data, error } = await this.supabase.from('video_questions').insert([questionData]).select().single();
    if (error) throw error;
    return data;
  }

  async updateVideoQuestion(id: string, questionData: UpdateVideoQuestionData): Promise<VideoQuestion> {
    const { data, error } = await this.supabase.from('video_questions').update(questionData).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async deleteVideoQuestion(id: string): Promise<void> {
    const { error } = await this.supabase.from('video_questions').delete().eq('id', id);
    if (error) throw error;
  }

  async getLessonsForSelect(): Promise<Lesson[]> {
    const { data: lessonsData, error: lessonsError } = await this.supabase
      .from('lessons').select('id, title, modules(title, courses(title))').eq('lesson_type', 'video').order('title');
    if (lessonsError) throw lessonsError;

    const { data: videosData } = await this.supabase.from('videos').select('lesson_id');
    const usedIds = new Set(videosData?.map((v: { lesson_id: string }) => v.lesson_id) || []);

    return lessonsData?.filter((l: { id: string }) => !usedIds.has(l.id)).map((l: any) => ({
      id: l.id, title: l.title, module_title: l.modules?.[0]?.title, course_title: l.modules?.[0]?.courses?.[0]?.title
    })) || [];
  }

  async searchVideos(query: string): Promise<Video[]> {
    const { data, error } = await this.supabase
      .from('videos').select(`*, lessons!inner(title, modules!inner(title, courses!inner(title)))`)
      .or(`url.ilike.%${query}%,provider_video_id.ilike.%${query}%,transcript.ilike.%${query}%`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data?.map(v => ({ ...v, lesson_title: v.lessons?.title, module_title: v.lessons?.modules?.title, course_title: v.lessons?.modules?.courses?.title })) || [];
  }
}

export const videoService = new VideoService();
