import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/adminHelpers';

export async function GET() {
  try {
    console.log('[MODULES STATS API] Request received');
    
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('[MODULES STATS API] Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or instructor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      console.log('[MODULES STATS API] Forbidden - not admin/instructor');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log('[MODULES STATS API] User role:', profile.role);

    // Calculate stats based on user role
    let stats;
    
    if (profile.role === 'admin') {
      // Admin can see all stats
      const adminClient = createAdminClient();
      
      // Get total modules count
      const { count: totalModules } = await adminClient
        .from('modules')
        .select('id', { count: 'exact' });

      // Get modules by course
      const { data: moduleData } = await adminClient
        .from('modules')
        .select('course_id');

      const modulesByCourse: { [courseId: string]: number } = {};
      moduleData?.forEach(module => {
        modulesByCourse[module.course_id] = (modulesByCourse[module.course_id] || 0) + 1;
      });

      // Get total lessons
      const { count: totalLessons } = await adminClient
        .from('lessons')
        .select('id', { count: 'exact' });

      const averageLessonsPerModule = totalModules && totalModules > 0 
        ? Math.round((totalLessons || 0) / totalModules * 10) / 10
        : 0;

      stats = {
        totalModules: totalModules || 0,
        modulesByCourse,
        totalLessons: totalLessons || 0,
        averageLessonsPerModule
      };
    } else {
      // Instructor can only see stats for their assigned courses (RLS will handle filtering)
      const { count: totalModules } = await supabase
        .from('modules')
        .select('id', { count: 'exact' });

      const { data: moduleData } = await supabase
        .from('modules')
        .select('course_id');

      const modulesByCourse: { [courseId: string]: number } = {};
      moduleData?.forEach(module => {
        modulesByCourse[module.course_id] = (modulesByCourse[module.course_id] || 0) + 1;
      });

      // For lessons, we need to join through modules to respect RLS
      const { data: lessonData } = await supabase
        .from('lessons')
        .select(`
          id,
          modules!inner(
            id,
            course_id
          )
        `);

      stats = {
        totalModules: totalModules || 0,
        modulesByCourse,
        totalLessons: lessonData?.length || 0,
        averageLessonsPerModule: totalModules && totalModules > 0 
          ? Math.round((lessonData?.length || 0) / totalModules * 10) / 10
          : 0
      };
    }

    console.log('[MODULES STATS API] Success:', stats);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching module stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch module stats' },
      { status: 500 }
    );
  }
}