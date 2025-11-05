import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, getAllowedInstructorCourseIds } from '@/lib/adminHelpers';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, first_name, last_name')
      .eq('id', user.id)
      .single();

    if (profileError || profile.role !== 'instructor') {
      return NextResponse.json({ error: 'Instructor access required' }, { status: 403 });
    }

    // Compute allowed courses (supports course_instructors) and fetch minimal course data via admin client
    const admin = createAdminClient();
    const allowedCourseIds = await getAllowedInstructorCourseIds(user.id);
    let courses: any[] = [];
    if (allowedCourseIds.length > 0) {
      const { data: courseRows, error: coursesError } = await admin
        .from('courses')
        .select('id, title, description, status, created_at')
        .in('id', allowedCourseIds);
      if (coursesError) {
        return NextResponse.json({ error: coursesError.message }, { status: 500 });
      }
      courses = courseRows || [];
    }

    // Get modules for instructor's courses
    const courseIds = courses.map((c: any) => c.id);

    const { data: modules, error: modulesError } = await admin
      .from('modules')
      .select(`
        id,
        title,
        description,
        position,
        course_id,
        created_at,
        courses(title)
      `)
      .in('course_id', courseIds.length ? courseIds : ['00000000-0000-0000-0000-000000000000'])
      .order('course_id')
      .order('position');

    if (modulesError) {
      return NextResponse.json({ error: modulesError.message }, { status: 500 });
    }

    // Get lessons count for each module
    const moduleIds = (modules || []).map((m: any) => m.id);
    const { data: lessonCounts, error: lessonsError } = await admin
      .from('lessons')
      .select('module_id')
      .in('module_id', moduleIds.length ? moduleIds : ['00000000-0000-0000-0000-000000000000']);

    // Calculate stats
    const stats = {
      totalCourses: courses.length || 0,
      totalModules: modules?.length || 0,
      totalLessons: lessonCounts?.length || 0,
      coursesByStatus: courses.reduce((acc: any, course: any) => {
        acc[course.status] = (acc[course.status] || 0) + 1;
        return acc;
      }, {}) || {}
    };

    // Group modules by course
    const modulesByCourse = modules?.reduce((acc: any, module) => {
      const courseId = module.course_id;
      if (!acc[courseId]) {
        acc[courseId] = [];
      }
      acc[courseId].push(module);
      return acc;
    }, {}) || {};

    return NextResponse.json({
      profile,
      courses: courses || [],
      modules: modules || [],
      modulesByCourse,
      stats
    });

  } catch (error) {
    console.error('Instructor dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}