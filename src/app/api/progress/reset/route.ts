import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    // Get user from authentication
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (action === 'analyze') {
      // Analyze the current state
      const { data: allProgress } = await supabaseAdmin
        .from('lesson_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at');

      const { data: allLessons } = await supabaseAdmin
        .from('lessons')
        .select('id, title, module_id, position')
        .order('position');

      const { data: allModules } = await supabaseAdmin
        .from('modules')
        .select('id, title, course_id, position')
        .order('position');

      return NextResponse.json({
        success: true,
        analysis: {
          totalProgressRecords: allProgress?.length || 0,
          totalLessons: allLessons?.length || 0,
          totalModules: allModules?.length || 0,
          progressRecords: allProgress || [],
          lessons: allLessons || [],
          modules: allModules || []
        }
      });
    }

    if (action === 'reset_all') {
      // Delete ALL progress records for the user
      const { error: deleteError, count } = await supabaseAdmin
        .from('lesson_progress')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        return NextResponse.json({ 
          success: false, 
          error: deleteError.message 
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Deleted ${count || 0} progress records. You can now start fresh.`
      });
    }

    if (action === 'reset_course') {
      const { courseId } = await request.json();
      
      // Get all lesson IDs for the course
      const { data: courseLessons } = await supabaseAdmin
        .from('modules')
        .select(`
          lessons (
            id
          )
        `)
        .eq('course_id', courseId);

      const lessonIds = courseLessons?.flatMap(m => m.lessons.map((l: any) => l.id)) || [];

      if (lessonIds.length > 0) {
        const { error: deleteError, count } = await supabaseAdmin
          .from('lesson_progress')
          .delete()
          .eq('user_id', user.id)
          .in('lesson_id', lessonIds);

        if (deleteError) {
          return NextResponse.json({ 
            success: false, 
            error: deleteError.message 
          }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: `Deleted ${count || 0} progress records for course ${courseId}.`
        });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Progress reset error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}