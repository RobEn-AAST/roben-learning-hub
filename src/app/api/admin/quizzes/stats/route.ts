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

    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const isAdmin = profile?.role === 'admin';
    const admin = createAdminClient();

    let totalQuizzes = 0;
    let totalQuestions = 0;
    let quizzesWithTimeLimit = 0;
    let quizLessons = 0;

    if (isAdmin) {
      const tqz = await supabase.from('quizzes').select('*', { count: 'exact', head: true });
      totalQuizzes = tqz.count || 0;
      const tqs = await supabase.from('questions').select('*', { count: 'exact', head: true });
      totalQuestions = tqs.count || 0;
      const twl = await supabase.from('quizzes').select('*', { count: 'exact', head: true }).not('time_limit_minutes', 'is', null);
      quizzesWithTimeLimit = twl.count || 0;
      const ql = await supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('lesson_type', 'quiz');
      quizLessons = ql.count || 0;
    } else {
      const allowedCourseIds = await getAllowedInstructorCourseIds(user.id);
      if (allowedCourseIds.length) {
        const { data: lessons } = await admin
          .from('lessons')
          .select('id, modules!inner(course_id)')
          .in('modules.course_id', allowedCourseIds)
          .eq('lesson_type', 'quiz');
        const lessonIds = (lessons || []).map((l: any) => l.id);
        quizLessons = lessonIds.length;
        if (lessonIds.length) {
          const qz = await admin.from('quizzes').select('id', { count: 'exact' }).in('lesson_id', lessonIds);
          totalQuizzes = qz.count || 0;
          const twl = await admin.from('quizzes').select('id', { count: 'exact' }).in('lesson_id', lessonIds).not('time_limit_minutes', 'is', null);
          quizzesWithTimeLimit = twl.count || 0;
          const { data: quizIdsRows } = await admin.from('quizzes').select('id').in('lesson_id', lessonIds);
          const quizIds = (quizIdsRows || []).map((r: any) => r.id);
          if (quizIds.length) {
            const tqs = await admin.from('questions').select('*', { count: 'exact', head: true }).in('quiz_id', quizIds);
            totalQuestions = tqs.count || 0;
          }
        }
      }
    }

    const stats = {
      total_quizzes: totalQuizzes,
      total_questions: totalQuestions,
      quizzes_with_time_limit: quizzesWithTimeLimit,
      quiz_lessons: quizLessons,
      available_lessons: Math.max(0, quizLessons - totalQuizzes)
    };

    console.log('✅ GET /api/admin/quizzes/stats - Stats:', stats);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('❌ GET /api/admin/quizzes/stats - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quiz stats' },
      { status: 500 }
    );
  }
}
