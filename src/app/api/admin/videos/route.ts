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
    console.log('[VIDEOS API POST] Video data received:', videoData);
    
    // Validate required fields
    if (!videoData.lesson_id || !videoData.provider || !videoData.provider_video_id || !videoData.url) {
      console.log('[VIDEOS API POST] Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: lesson_id, provider, provider_video_id, url' },
        { status: 400 }
      );
    }
    
    // Use admin client to bypass RLS
    const adminClient = createAdminClient();
    
    const { data: video, error } = await adminClient
      .from('videos')
      .insert([videoData])
      .select()
      .single();
    
    if (error) {
      console.error('[VIDEOS API POST] Database error:', error);
      return NextResponse.json(
        { error: `Failed to create video: ${error.message}` },
        { status: 500 }
      );
    }
    
    console.log('[VIDEOS API POST] Video created successfully:', video.id);
    
    // Log activity
    await activityLogService.logActivity({
      action: 'CREATE',
      table_name: 'videos',
      record_id: video.id,
      record_name: video.url,
      description: `Created video: ${video.url}`
    });

    return NextResponse.json(video, { status: 201 });
  } catch (error) {
    console.error('[VIDEOS API POST] Error creating video:', error);
    return NextResponse.json(
      { error: `Failed to create video: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
