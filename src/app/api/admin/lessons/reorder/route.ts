import { NextRequest, NextResponse } from 'next/server';
import { lessonService } from '@/services/lessonService';
import { createClient } from '@/lib/supabase/server';
import { activityLogService } from '@/services/activityLogService';

export async function PUT(request: NextRequest) {
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
    const { module_id, lesson_ids } = body;

    // Validate required fields
    if (!module_id || !lesson_ids || !Array.isArray(lesson_ids)) {
      return NextResponse.json(
        { error: 'Missing required fields: module_id, lesson_ids (array)' },
        { status: 400 }
      );
    }

    await lessonService.reorderLessons(module_id, lesson_ids);
    
    // Log the action
    await activityLogService.logActivity({
      action: 'UPDATE',
      resource_type: 'lessons',
      resource_id: module_id,
      details: `Reordered ${lesson_ids.length} lessons in module`
    });

    return NextResponse.json({ message: 'Lessons reordered successfully' });
  } catch (error) {
    console.error('Error reordering lessons:', error);
    return NextResponse.json(
      { error: 'Failed to reorder lessons' },
      { status: 500 }
    );
  }
}