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
    // Check admin or instructor permission
    const permissionError = await checkAdminOrInstructorPermission();
    if (permissionError) return permissionError;

    const videoData = await request.json();
    const video = await videoService.createVideo(videoData);
    
    // Log activity
    await activityLogService.logActivity({
      action: 'create_video',
      resource_type: 'video',
      resource_id: video.id,
      details: `Created video: ${video.url}`,
      metadata: { video_url: video.url, provider: video.provider }
    });

    return NextResponse.json(video, { status: 201 });
  } catch (error) {
    console.error('Error creating video:', error);
    return NextResponse.json(
      { error: 'Failed to create video' },
      { status: 500 }
    );
  }
}
