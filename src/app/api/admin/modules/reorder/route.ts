import { NextRequest, NextResponse } from 'next/server';
import { moduleService } from '@/services/moduleService';
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
    const { course_id, module_ids } = body;

    // Validate required fields
    if (!course_id || !module_ids || !Array.isArray(module_ids)) {
      return NextResponse.json(
        { error: 'Missing required fields: course_id, module_ids (array)' },
        { status: 400 }
      );
    }

    await moduleService.reorderModules(course_id, module_ids);
    
    // Log the action
    await activityLogService.logActivity({
      action: 'UPDATE',
      resource_type: 'modules',
      resource_id: course_id,
      details: `Reordered ${module_ids.length} modules in course`
    });

    return NextResponse.json({ message: 'Modules reordered successfully' });
  } catch (error) {
    console.error('Error reordering modules:', error);
    return NextResponse.json(
      { error: 'Failed to reorder modules' },
      { status: 500 }
    );
  }
}