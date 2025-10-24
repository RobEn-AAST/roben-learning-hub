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
      // Get total videos and duration
      const { data: videosData, error: videosError } = await this.supabase
        .from('videos')
        .select('duration_seconds, provider, transcript');

      if (videosError) {
        console.error('Videos query error:', videosError);
        throw new Error(`Failed to fetch videos: ${videosError.message}`);
      }

      // Get videos with questions count (handle if table doesn't exist)
      let videosWithQuestions = 0;
      
      try {
        const { data: questionsData, error: questionsError } = await this.supabase
          .from('video_questions')
          .select('video_id');

        if (questionsError) {
          console.warn('Video questions table error (may not exist):', questionsError);
          // Don't throw - just use 0 count
        } else {
          const uniqueVideoIds = new Set(questionsData?.map(q => q.video_id) || []);
          videosWithQuestions = uniqueVideoIds.size;
        }
      } catch (questionsTableError) {
        console.warn('Video questions table not accessible:', questionsTableError);
        // Use default value of 0
      }

      const totalVideos = videosData?.length || 0;
      const totalDurationSeconds = videosData?.reduce((sum, video) => sum + (video.duration_seconds || 0), 0) || 0;
      const totalDurationHours = Math.round((totalDurationSeconds / 3600) * 100) / 100;

      // Group by provider
      const videosByProvider = videosData?.reduce((acc, video) => {
        acc[video.provider] = (acc[video.provider] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const videosWithTranscript = videosData?.filter(video => video.transcript).length || 0;

      return {
        total_videos: totalVideos,
        total_duration_hours: totalDurationHours,
        videos_by_provider: videosByProvider,
        videos_with_questions: videosWithQuestions,
        videos_with_transcript: videosWithTranscript
      };
    } catch (error) {
      console.error('Error getting video stats:', error);
      throw error;
    }
  }

  async getAllVideos(): Promise<Video[]> {
    try {
      const { data, error } = await this.supabase
        .from('videos')
        .select(`
          *,
          lessons!inner(
            title,
            modules!inner(
              title,
              courses!inner(title)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(video => ({
        ...video,
        lesson_title: video.lessons?.title,
        module_title: video.lessons?.modules?.title,
        course_title: video.lessons?.modules?.courses?.title
      })) || [];
    } catch (error) {
      console.error('Error fetching videos:', error);
      throw error;
    }
  }

  async getVideoById(id: string): Promise<Video | null> {
    try {
      const { data, error } = await this.supabase
        .from('videos')
        .select(`
          *,
          lessons!inner(
            title,
            modules!inner(
              title,
              courses!inner(title)
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      if (!data) return null;

      return {
        ...data,
        lesson_title: data.lessons?.title,
        module_title: data.lessons?.modules?.title,
        course_title: data.lessons?.modules?.courses?.title
      };
    } catch (error) {
      console.error('Error fetching video:', error);
      throw error;
    }
  }

  async createVideo(videoData: CreateVideoData): Promise<Video> {
    try {
      const { data, error } = await this.supabase
        .from('videos')
        .insert([videoData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating video:', error);
      throw error;
    }
  }

  async updateVideo(id: string, videoData: UpdateVideoData): Promise<Video> {
    try {
      const { data, error } = await this.supabase
        .from('videos')
        .update({ ...videoData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating video:', error);
      throw error;
    }
  }

  async deleteVideo(id: string): Promise<void> {
    try {
      // First delete related video questions
      await this.supabase
        .from('video_questions')
        .delete()
        .eq('video_id', id);

      // Then delete the video
      const { error } = await this.supabase
        .from('videos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting video:', error);
      throw error;
    }
  }

  async getVideoQuestions(videoId: string): Promise<VideoQuestion[]> {
    try {
      const { data, error } = await this.supabase
        .from('video_questions')
        .select('*')
        .eq('video_id', videoId)
        .order('timestamp_seconds', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching video questions:', error);
      throw error;
    }
  }

  async createVideoQuestion(questionData: CreateVideoQuestionData): Promise<VideoQuestion> {
    try {
      const { data, error } = await this.supabase
        .from('video_questions')
        .insert([questionData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating video question:', error);
      throw error;
    }
  }

  async updateVideoQuestion(id: string, questionData: UpdateVideoQuestionData): Promise<VideoQuestion> {
    try {
      const { data, error } = await this.supabase
        .from('video_questions')
        .update(questionData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating video question:', error);
      throw error;
    }
  }

  async deleteVideoQuestion(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('video_questions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting video question:', error);
      throw error;
    }
  }

  async getLessonsForSelect(): Promise<Lesson[]> {
    try {
      // First, get all video-type lessons
      const { data: lessonsData, error: lessonsError } = await this.supabase
        .from('lessons')
        .select(`
          id,
          title,
          modules(
            title,
            courses(title)
          )
        `)
        .eq('lesson_type', 'video')  // Only get video lessons
        .order('title');

      if (lessonsError) {
        console.error('❌ VideoService.getLessonsForSelect - Error fetching lessons:', lessonsError);
        throw lessonsError;
      }

      // Get all lesson IDs that already have videos
      const { data: videosData, error: videosError } = await this.supabase
        .from('videos')
        .select('lesson_id');

      if (videosError) {
        console.error('❌ VideoService.getLessonsForSelect - Error fetching videos:', videosError);
        throw videosError;
      }

      // Create a Set of lesson IDs that already have videos
      const usedLessonIds = new Set(videosData?.map((video: { lesson_id: string }) => video.lesson_id) || []);
      console.log('📋 VideoService.getLessonsForSelect - Lessons with existing videos:', usedLessonIds.size);

      // Filter out lessons that already have videos
      const availableLessons = lessonsData?.filter((lesson: { id: string }) => !usedLessonIds.has(lesson.id)) || [];

      const lessons = availableLessons.map((lesson: {
        id: string;
        title: string;
        modules: {
          title: string;
          courses: { title: string }[];
        }[];
      }) => ({
        id: lesson.id,
        title: lesson.title,
        module_title: lesson.modules[0]?.title,
        course_title: lesson.modules[0]?.courses[0]?.title
      }));

      console.log('✅ VideoService.getLessonsForSelect - Found', lessons.length, 'available lessons (filtered from', lessonsData?.length || 0, 'total)');
      
      return lessons;
    } catch (error) {
      console.error('❌ VideoService.getLessonsForSelect - Error:', error);
      throw error;
    }
  }

  async searchVideos(query: string): Promise<Video[]> {
    try {
      const { data, error } = await this.supabase
        .from('videos')
        .select(`
          *,
          lessons!inner(
            title,
            modules!inner(
              title,
              courses!inner(title)
            )
          )
        `)
        .or(`url.ilike.%${query}%,provider_video_id.ilike.%${query}%,transcript.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(video => ({
        ...video,
        lesson_title: video.lessons?.title,
        module_title: video.lessons?.modules?.title,
        course_title: video.lessons?.modules?.courses?.title
      })) || [];
    } catch (error) {
      console.error('Error searching videos:', error);
      throw error;
    }
  }
}

export const videoService = new VideoService();
