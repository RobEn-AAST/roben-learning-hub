import { NextRequest, NextResponse } from 'next/server';
import { lessonService, serverLessonService } from '@/services/lessonService';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, checkAdminOrInstructorPermission, getAllowedInstructorCourseIds } from '@/lib/adminHelpers';
import { activityLogService } from '@/services/activityLogService';

export async function GET(request: NextRequest) {
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
  const isInstructor = profile?.role === 'instructor';
  // Always use admin client to bypass RLS, but apply scoping for instructors via filters
  const clientToUse = adminClient;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const moduleId = searchParams.get('module_id');
    const courseId = searchParams.get('course_id');
    const lessonType = searchParams.get('lesson_type');
    const status = searchParams.get('status');

    const filters: any = {
      ...(moduleId && { module_id: moduleId }),
      ...(courseId && { course_id: courseId }),
      ...(lessonType && { lesson_type: lessonType }),
      ...(status && { status: status })
    };

    if (isInstructor && !courseId) {
      // Only scope when a specific course filter isn't already provided
      const allowedCourseIds = await getAllowedInstructorCourseIds(user!.id);
      // If no allowed courses, return empty early
      if (allowedCourseIds.length === 0) {
        return NextResponse.json({ lessons: [], total: 0 });
      }
      filters.allowed_course_ids = allowedCourseIds;
    }

    // Use appropriate client based on user role
  const result = await serverLessonService.getLessons(clientToUse, page, limit, filters);
    
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
    // Check admin or instructor permission
    const permissionError = await checkAdminOrInstructorPermission();
    if (permissionError) return permissionError;

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

    // Use admin client for lesson creation (only admins should create lessons via RLS policies)
    const adminClient = createAdminClient();
    const newLesson = await serverLessonService.createLesson(adminClient, lessonData);
    
    // Log the action
    await activityLogService.logActivity({
      action: 'CREATE',
      table_name: 'lessons',
      record_id: newLesson.id,
      description: `Created lesson: ${title} (${lesson_type})`
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