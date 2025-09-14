import { NextRequest, NextResponse } from 'next/server';
import { lessonService } from '@/services/lessonService';
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

    const lesson = await lessonService.getLessonById(params.id);
    
    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    return NextResponse.json(lesson);
  } catch (error) {
    console.error('Error fetching lesson:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lesson' },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const body = await request.json();
    const { title, lesson_type, position, status, instructor_id, metadata } = body;

    // Validate lesson_type if provided
    if (lesson_type && !['video', 'article', 'project', 'quiz'].includes(lesson_type)) {
      return NextResponse.json(
        { error: 'Invalid lesson_type. Must be one of: video, article, project, quiz' },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (status && !['visible', 'hidden'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: visible, hidden' },
        { status: 400 }
      );
    }

    const updateData = {
      ...(title && { title }),
      ...(lesson_type && { lesson_type }),
      ...(position !== undefined && { position }),
      ...(status && { status }),
      ...(instructor_id && { instructor_id }),
      ...(metadata && { metadata })
    };

    const updatedLesson = await lessonService.updateLesson(params.id, updateData);
    
    // Log the action
    await activityLogService.logActivity({
      action: 'UPDATE',
      resource_type: 'lessons',
      resource_id: params.id,
      details: `Updated lesson: ${updatedLesson.title}`
    });

    return NextResponse.json(updatedLesson);
  } catch (error) {
    console.error('Error updating lesson:', error);
    return NextResponse.json(
      { error: 'Failed to update lesson' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Get lesson details before deletion for logging
    const lesson = await lessonService.getLessonById(params.id);
    
    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    await lessonService.deleteLesson(params.id);
    
    // Log the action
    await activityLogService.logActivity({
      action: 'DELETE',
      resource_type: 'lessons',
      resource_id: params.id,
      details: `Deleted lesson: ${lesson.title}`
    });

    return NextResponse.json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    return NextResponse.json(
      { error: 'Failed to delete lesson' },
      { status: 500 }
    );
  }
}