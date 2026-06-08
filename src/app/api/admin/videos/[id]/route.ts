import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/adminHelpers';
import { activityLogService } from '@/services/activityLogService';

export async function GET(
  request: NextRequest,
  { params }: any
) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data: video, error } = await admin
      .from('videos')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    return NextResponse.json(video);
  } catch (error) {
    console.error('Error fetching video:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: any
) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const allowedFields = ['url', 'title', 'description', 'duration_seconds', 'provider', 'provider_video_id', 'transcript'] as const;
    const videoData: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const key of allowedFields) {
      if (body[key] !== undefined) videoData[key] = body[key];
    }

    const admin = createAdminClient();
    const { data: video, error } = await admin
      .from('videos')
      .update(videoData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating video:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity
    try {
      await activityLogService.logActivity({
        action: 'update_video',
        table_name: 'videos',
        record_id: video.id,
        description: `Updated video: ${video.url}`
      });
    } catch { /* don't fail on log error */ }

    return NextResponse.json(video);
  } catch (error) {
    console.error('Error updating video:', error);
    return NextResponse.json(
      { error: 'Failed to update video' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: any
) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const admin = createAdminClient();

    // Get video info before deletion for logging
    const { data: video } = await admin
      .from('videos')
      .select('url')
      .eq('id', id)
      .single();

    // Delete questions first, then video
    await admin.from('video_questions').delete().eq('video_id', id);
    const { error } = await admin.from('videos').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity
    try {
      await activityLogService.logActivity({
        action: 'delete_video',
        table_name: 'videos',
        record_id: id,
        description: `Deleted video: ${video?.url || 'Unknown'}`
      });
    } catch { /* don't fail on log error */ }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting video:', error);
    return NextResponse.json(
      { error: 'Failed to delete video' },
      { status: 500 }
    );
  }
}
