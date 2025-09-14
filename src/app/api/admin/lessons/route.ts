import { NextRequest, NextResponse } from 'next/server';
import { lessonService, serverLessonService } from '@/services/lessonService';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { activityLogService } from '@/services/activityLogService';

// Create admin client with service role key to bypass RLS
const createAdminClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const moduleId = searchParams.get('module_id');
    const courseId = searchParams.get('course_id');
    const lessonType = searchParams.get('lesson_type');
    const status = searchParams.get('status');

    const filters = {
      ...(moduleId && { module_id: moduleId }),
      ...(courseId && { course_id: courseId }),
      ...(lessonType && { lesson_type: lessonType }),
      ...(status && { status: status })
    };

    // Use admin client to bypass RLS for instructor data fetching
    const adminClient = createAdminClient();
    const result = await serverLessonService.getLessons(adminClient, page, limit, filters);
    
    // Debug: Log the first lesson to see the data structure
    if (result.lessons && result.lessons.length > 0) {
      console.log('First lesson data:', {
        id: result.lessons[0].id,
        title: result.lessons[0].title,
        instructor_id: result.lessons[0].instructor_id,
        instructor: result.lessons[0].instructor,
        rawData: JSON.stringify(result.lessons[0], null, 2)
      });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching lessons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lessons' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const { module_id, title, lesson_type, position, status, instructor_id, metadata } = body;

    // Validate required fields
    if (!module_id || !title || !lesson_type || !instructor_id) {
      return NextResponse.json(
        { error: 'Missing required fields: module_id, title, lesson_type, instructor_id' },
        { status: 400 }
      );
    }

    // Validate lesson_type
    if (!['video', 'article', 'project', 'quiz'].includes(lesson_type)) {
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

    const lessonData = {
      module_id,
      title,
      lesson_type,
      position,
      status: status || 'hidden', // Default to 'hidden' if no status provided
      instructor_id,
      metadata: metadata || {}
    };

    // Use admin client to bypass RLS for lesson creation
    const adminClient = createAdminClient();
    const newLesson = await serverLessonService.createLesson(adminClient, lessonData);
    
    // Log the action
    await activityLogService.logActivity({
      action: 'CREATE',
      resource_type: 'lessons',
      resource_id: newLesson.id,
      details: `Created lesson: ${title} (${lesson_type})`
    });

    return NextResponse.json(newLesson, { status: 201 });
  } catch (error) {
    console.error('Error creating lesson:', error);
    return NextResponse.json(
      { error: 'Failed to create lesson' },
      { status: 500 }
    );
  }
}