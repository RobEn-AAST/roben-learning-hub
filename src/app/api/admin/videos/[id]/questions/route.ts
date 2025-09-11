import { NextRequest, NextResponse } from 'next/server';
import { videoService } from '@/services/videoService';
import { createClient } from '@/lib/supabase/server';
import { activityLogService } from '@/services/activityLogService';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const questions = await videoService.getVideoQuestions(params.id);
    return NextResponse.json(questions);
  } catch (error) {
    console.error('Error fetching video questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video questions' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const questionData = await request.json();
    const question = await videoService.createVideoQuestion({
      ...questionData,
      video_id: params.id
    });
    
    // Log activity
    await activityLogService.logActivity({
      action: 'create_video_question',
      resource_type: 'video_question',
      resource_id: question.id,
      details: `Created question for video ${params.id}`,
      metadata: { question: question.question, timestamp: question.timestamp_seconds }
    });

    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    console.error('Error creating video question:', error);
    return NextResponse.json(
      { error: 'Failed to create video question' },
      { status: 500 }
    );
  }
}
