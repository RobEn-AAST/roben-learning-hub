import { NextRequest, NextResponse } from 'next/server';
import { moduleService } from '@/services/moduleService';
import { createAdminClient } from '@/lib/adminHelpers';
import { checkAdminOrInstructorPermission } from '@/lib/adminHelpers';
import { createClient } from '@/lib/supabase/server';
import { activityLogService } from '@/services/activityLogService';

export async function GET(request: NextRequest) {
  try {
    console.log('[MODULES API GET] Request received');
    
    const permissionError = await checkAdminOrInstructorPermission();
    if (permissionError) {
      console.log('[MODULES API GET] Permission denied');
      return permissionError;
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get user role to determine which client to use
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user!.id)
      .single();

    // Use admin client for admins, regular client for instructors (to respect RLS)
    const client = profile?.role === 'admin' ? adminClient : supabase;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const courseId = searchParams.get('course_id');
    const search = searchParams.get('search');

    console.log('[MODULES API GET] Query params:', { page, limit, courseId, search, userRole: profile?.role });

    const filters = {
      ...(courseId && { course_id: courseId }),
      ...(search && { search: search })
    };

    // Use appropriate client based on user role
    const offset = (page - 1) * limit;
    
    let query = client
      .from('modules')
      .select(`
        *,
        courses!inner(
          id,
          title,
          status
        )
      `, { count: 'exact' })
      .order('position', { ascending: true });

    // Apply filters
    if (filters.course_id) {
      query = query.eq('course_id', filters.course_id);
    }
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data: modules, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('[MODULES API GET] Query error:', error);
      throw new Error(`Failed to fetch modules: ${error.message}`);
    }

    console.log('[MODULES API GET] Success:', { modulesCount: modules?.length, totalCount: count });

    // Get lesson counts for each module
    const modulesWithCounts = await Promise.all((modules || []).map(async (module) => {
      const { count: lessonsCount } = await client
        .from('lessons')
        .select('id', { count: 'exact' })
        .eq('module_id', module.id);

      return {
        ...module,
        course: module.courses,
        lessons_count: lessonsCount || 0
      };
    }));

    return NextResponse.json({
      modules: modulesWithCounts,
      total: count || 0
    });
  } catch (error) {
    console.error('Error fetching modules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch modules' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[MODULES API POST] Request received');
    
    const permissionError = await checkAdminOrInstructorPermission();
    if (permissionError) {
      console.log('[MODULES API POST] Permission denied');
      return permissionError;
    }

    const adminClient = createAdminClient();
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user!.id)
      .single();

    const body = await request.json();
    const { course_id, title, description, position, metadata } = body;

    console.log('[MODULES API POST] Body received:', { course_id, title, description, position });

    // Validate required fields
    if (!course_id || !title || !description) {
      console.log('[MODULES API POST] Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: course_id, title, description' },
        { status: 400 }
      );
    }

    // If user is instructor, check if they're assigned to this course
    if (profile?.role === 'instructor') {
      const { data: assignment } = await adminClient
        .from('course_instructors')
        .select('id')
        .eq('course_id', course_id)
        .eq('instructor_id', user!.id)
        .single();

      if (!assignment) {
        console.log('[MODULES API POST] Instructor not assigned to course');
        return NextResponse.json(
          { error: 'You can only create modules for courses you are assigned to teach' },
          { status: 403 }
        );
      }
    }

    // Calculate position if not provided
    let modulePosition = position;
    if (!modulePosition) {
      const { count } = await adminClient
        .from('modules')
        .select('id', { count: 'exact' })
        .eq('course_id', course_id);
      
      modulePosition = (count || 0) + 1;
    }

    const moduleData = {
      course_id,
      title,
      description,
      position: modulePosition,
      metadata: metadata || {}
    };

    console.log('[MODULES API POST] Creating module:', moduleData);

    // Create module using admin client
    const { data: newModule, error } = await adminClient
      .from('modules')
      .insert(moduleData)
      .select(`
        *,
        courses!inner(
          id,
          title,
          status
        )
      `)
      .single();

    if (error) {
      console.error('[MODULES API POST] Create error:', error);
      throw new Error(`Failed to create module: ${error.message}`);
    }

    console.log('[MODULES API POST] Module created successfully:', newModule.id);
    
    // Log the action
    await activityLogService.logActivity({
      action: 'CREATE',
      table_name: 'modules',
      record_id: newModule.id,
      description: `Created module: ${title}`
    });

    const result = {
      ...newModule,
      course: newModule.courses,
      lessons_count: 0
    };

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating module:', error);
    return NextResponse.json(
      { error: 'Failed to create module' },
      { status: 500 }
    );
  }
}