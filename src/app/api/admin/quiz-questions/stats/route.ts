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

    let totalQuestions = 0;
    let multipleChoiceQuestions = 0;
    let trueFalseQuestions = 0;
    let totalOptions = 0;

    if (isAdmin) {
      const tq = await supabase.from('questions').select('*', { count: 'exact', head: true });
      totalQuestions = tq.count || 0;
      const mc = await supabase.from('questions').select('*', { count: 'exact', head: true }).eq('type', 'multiple_choice');
      multipleChoiceQuestions = mc.count || 0;
      const tf = await supabase.from('questions').select('*', { count: 'exact', head: true }).eq('type', 'true_false');
      trueFalseQuestions = tf.count || 0;
      const to = await supabase.from('question_options').select('*', { count: 'exact', head: true });
      totalOptions = to.count || 0;
    } else {
      // Instructor: scope to quizzes within allowed courses
      const allowedCourseIds = await getAllowedInstructorCourseIds(user.id);
      if (allowedCourseIds.length === 0) {
        // all zeros
      } else {
        const { data: lessons } = await admin
          .from('lessons')
          .select('id, modules!inner(course_id)')
          .in('modules.course_id', allowedCourseIds);
        const lessonIds = (lessons || []).map((l: any) => l.id);
        if (lessonIds.length) {
          const { data: quizzes } = await admin
            .from('quizzes')
            .select('id, lesson_id')
            .in('lesson_id', lessonIds);
          const quizIds = (quizzes || []).map((q: any) => q.id);
          if (quizIds.length) {
            // Count questions by type
            const tq = await admin.from('questions').select('*', { count: 'exact', head: true }).in('quiz_id', quizIds);
            totalQuestions = tq.count || 0;
            const mc = await admin.from('questions').select('*', { count: 'exact', head: true }).in('quiz_id', quizIds).eq('type', 'multiple_choice');
            multipleChoiceQuestions = mc.count || 0;
            const tf = await admin.from('questions').select('*', { count: 'exact', head: true }).in('quiz_id', quizIds).eq('type', 'true_false');
            trueFalseQuestions = tf.count || 0;
            // Count options for the scoped questions: fetch question IDs minimally
            const { data: qids } = await admin.from('questions').select('id').in('quiz_id', quizIds);
            const questionIds = (qids || []).map((r: any) => r.id);
            if (questionIds.length) {
              const to = await admin.from('question_options').select('*', { count: 'exact', head: true }).in('question_id', questionIds);
              totalOptions = to.count || 0;
            }
          }
        }
      }
    }

    const stats = {
      total_questions: totalQuestions,
      multiple_choice_questions: multipleChoiceQuestions,
      true_false_questions: trueFalseQuestions,
      total_options: totalOptions
    };

    console.log('✅ GET /api/admin/quiz-questions/stats - Stats:', stats);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('❌ GET /api/admin/quiz-questions/stats - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch question stats' },
      { status: 500 }
    );
  }
}
