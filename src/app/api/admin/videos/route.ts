import { NextRequest, NextResponse } from 'next/server';
import { videoService } from '@/services/videoService';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, checkAdminOrInstructorPermission } from '@/lib/adminHelpers';
import { activityLogService } from '@/services/activityLogService';

export async function GET() {
  try {
    // Check admin or instructor permission
    const permissionError = await checkAdminOrInstructorPermission();
    if (permissionError) return permissionError;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Check user role to determine which client to use
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user!.id)
      .single();

    const isAdmin = profile?.role === 'admin';
    // Use admin client for admins (bypasses RLS), regular client for instructors (respects RLS)
    const clientToUse = isAdmin ? adminClient : supabase;

    const videos = await videoService.getAllVideos();
    return NextResponse.json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[VIDEOS API POST] Request received');
    
    // Check admin or instructor permission
    const permissionError = await checkAdminOrInstructorPermission();
    if (permissionError) {
      console.log('[VIDEOS API POST] Permission denied');
      return permissionError;
    }

    const videoData = await request.json();
    console.log('[VIDEOS API POST] Video data received:', JSON.stringify(videoData, null, 2));
    
    // Validate required fields with detailed error messages
    const missingFields: string[] = [];
    if (!videoData.lesson_id) missingFields.push('lesson_id');
    if (!videoData.provider) missingFields.push('provider');
    if (!videoData.provider_video_id) missingFields.push('provider_video_id');
    if (!videoData.url) missingFields.push('url');
    
    if (missingFields.length > 0) {
      console.log('[VIDEOS API POST] Missing required fields:', missingFields);
      return NextResponse.json(
        { 
          error: `Missing required fields: ${missingFields.join(', ')}`,
          message: `Please provide all required fields: ${missingFields.join(', ')}`,
          missingFields 
        },
        { status: 400 }
      );
    }

    // Validate duration_seconds
    if (videoData.duration_seconds !== undefined && videoData.duration_seconds !== null) {
      const duration = Number(videoData.duration_seconds);
      if (isNaN(duration) || duration < 0) {
        return NextResponse.json(
          { 
            error: 'Invalid duration_seconds value',
            message: 'duration_seconds must be a positive number'
          },
          { status: 400 }
        );
      }
      videoData.duration_seconds = duration;
    } else {
      videoData.duration_seconds = 0; // Default value
    }
    
    // Ensure metadata is an object
    if (!videoData.metadata || typeof videoData.metadata !== 'object') {
      videoData.metadata = {};
    }

    // Ensure transcript is a string or null
    if (videoData.transcript === undefined) {
      videoData.transcript = '';
    }
    
    // Use admin client to bypass RLS
    const adminClient = createAdminClient();
    
    // Check if lesson exists
    const { data: lesson, error: lessonError } = await adminClient
      .from('lessons')
      .select('id, title')
      .eq('id', videoData.lesson_id)
      .single();
    
    if (lessonError || !lesson) {
      console.error('[VIDEOS API POST] Lesson not found:', lessonError);
      return NextResponse.json(
        { 
          error: 'Invalid lesson_id',
          message: `Lesson with ID ${videoData.lesson_id} not found`
        },
        { status: 404 }
      );
    }

    // Check if video already exists for this lesson
    const { data: existingVideo } = await adminClient
      .from('videos')
      .select('id')
      .eq('lesson_id', videoData.lesson_id)
      .single();
    
    if (existingVideo) {
      console.log('[VIDEOS API POST] Video already exists for this lesson');
      return NextResponse.json(
        { 
          error: 'Video already exists',
          message: `A video already exists for this lesson. Please edit the existing video instead.`,
          existingVideoId: existingVideo.id
        },
        { status: 409 }
      );
    }
    
    const { data: video, error } = await adminClient
      .from('videos')
      .insert([videoData])
      .select()
      .single();
    
    if (error) {
      console.error('[VIDEOS API POST] Database error:', error);
      return NextResponse.json(
        { 
          error: `Database error: ${error.message}`,
          message: `Failed to create video: ${error.message}`,
          details: error.details,
          hint: error.hint,
          code: error.code
        },
        { status: 500 }
      );
    }
    
    console.log('[VIDEOS API POST] Video created successfully:', video.id);
    
    // Log activity
    try {
      await activityLogService.logActivity({
        action: 'CREATE',
        table_name: 'videos',
        record_id: video.id,
        record_name: video.url,
        description: `Created video: ${video.url}`
      });
    } catch (logError) {
      console.warn('[VIDEOS API POST] Failed to log activity:', logError);
      // Don't fail the request if logging fails
    }

    return NextResponse.json(video, { status: 201 });
  } catch (error) {
    console.error('[VIDEOS API POST] Error creating video:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        error: `Failed to create video: ${errorMessage}`,
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
