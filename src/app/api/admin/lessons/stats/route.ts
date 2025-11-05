import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, getAllowedInstructorCourseIds } from '@/lib/adminHelpers';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or instructor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return NextResponse.json({ error: 'Admin or Instructor access required' }, { status: 403 });
    }

    const isAdmin = profile?.role === 'admin';

    if (isAdmin) {
      // Admin: global counts using head-only queries (no payload)
      const [
        total,
        visible,
        hidden,
        video,
        article,
        project,
        quiz
      ] = await Promise.all([
        supabase.from('lessons').select('*', { count: 'exact', head: true }),
        supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('status', 'visible'),
        supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('status', 'hidden'),
        supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('lesson_type', 'video'),
        supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('lesson_type', 'article'),
        supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('lesson_type', 'project'),
        supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('lesson_type', 'quiz')
      ]);

      return NextResponse.json({
        totalLessons: total.count || 0,
        publishedLessons: visible.count || 0,
        draftLessons: hidden.count || 0,
        videoLessons: video.count || 0,
        articleLessons: article.count || 0,
        projectLessons: project.count || 0,
        quizLessons: quiz.count || 0,
      });
    }

    // Instructor: scope by allowed courses (course_instructors and legacy lesson assignments)
    const admin = createAdminClient();
    const allowedCourseIds = await getAllowedInstructorCourseIds(user.id);

    if (!allowedCourseIds || allowedCourseIds.length === 0) {
      return NextResponse.json({
        totalLessons: 0,
        publishedLessons: 0,
        draftLessons: 0,
        videoLessons: 0,
        articleLessons: 0,
        projectLessons: 0,
        quizLessons: 0,
      });
    }

    // Helper to build a head-only count with course scoping via modules join
    const scopedCount = async (filters?: { status?: string; lesson_type?: string }) => {
      let query = admin
        .from('lessons')
        .select('id, modules!inner(course_id)', { count: 'exact', head: true })
        .in('modules.course_id', allowedCourseIds);

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.lesson_type) query = query.eq('lesson_type', filters.lesson_type);

      const { count } = await query;
      return count || 0;
    };

    const [
      totalLessons,
      publishedLessons,
      draftLessons,
      videoLessons,
      articleLessons,
      projectLessons,
      quizLessons
    ] = await Promise.all([
      scopedCount(),
      scopedCount({ status: 'visible' }),
      scopedCount({ status: 'hidden' }),
      scopedCount({ lesson_type: 'video' }),
      scopedCount({ lesson_type: 'article' }),
      scopedCount({ lesson_type: 'project' }),
      scopedCount({ lesson_type: 'quiz' }),
    ]);

    return NextResponse.json({
      totalLessons,
      publishedLessons,
      draftLessons,
      videoLessons,
      articleLessons,
      projectLessons,
      quizLessons,
    });
  } catch (error) {
    console.error('Error fetching lesson stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lesson stats' },
      { status: 500 }
    );
  }
}