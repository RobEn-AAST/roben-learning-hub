import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, getAllowedInstructorCourseIds } from '@/lib/adminHelpers';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ GET /api/admin/quiz-questions/quizzes - Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('🔍 GET /api/admin/quiz-questions/quizzes - User ID:', user.id);
    console.log('🔍 GET /api/admin/quiz-questions/quizzes - User role:', profile?.role);

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // For instructors, scope to their assigned lessons
    let quizzes: any[] | null = null;
    let error: any = null;

    if (profile?.role === 'admin') {
      const resp = await supabase
        .from('quizzes')
        .select(`
          id,
          title,
          lesson_id,
          lessons!inner(
            id,
            title,
            modules!inner(
              id,
              title,
              courses!inner(
                id,
                title
              )
            )
          )
        `)
        .order('title');
      quizzes = resp.data;
      error = resp.error;
    } else {
      // Instructor: quizzes whose lessons belong to allowed courses
      const admin = createAdminClient();
      const courseIds = await getAllowedInstructorCourseIds(user.id);
      if (courseIds.length === 0) {
        quizzes = [];
      } else {
        const { data: lessons } = await admin
          .from('lessons')
          .select('id, modules!inner(course_id)')
          .in('modules.course_id', courseIds);
        const lessonIds = (lessons || []).map((l: any) => l.id);
        if (!lessonIds.length) {
          quizzes = [];
        } else {
          const resp = await admin
            .from('quizzes')
            .select(`
              id,
              title,
              lesson_id,
              lessons!inner(
                id,
                title,
                modules!inner(
                  id,
                  title,
                  courses!inner(
                    id,
                    title
                  )
                )
              )
            `)
            .in('lesson_id', lessonIds)
            .order('title');
          quizzes = resp.data;
          error = resp.error;
        }
      }
    }

    if (error) {
      console.error('❌ GET /api/admin/quiz-questions/quizzes - Error:', error);
      return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 });
    }

    // Map the data to a cleaner format
    const mappedQuizzes = quizzes?.map((quiz: any) => ({
      id: quiz.id,
      title: quiz.title,
      lesson_id: quiz.lesson_id,
      lesson_title: quiz.lessons?.title,
      module_title: quiz.lessons?.modules?.title,
      course_title: quiz.lessons?.modules?.courses?.title
    })) || [];

    console.log('✅ GET /api/admin/quiz-questions/quizzes - Found', mappedQuizzes.length, 'quizzes');
    return NextResponse.json(mappedQuizzes);
  } catch (error) {
    console.error('❌ GET /api/admin/quiz-questions/quizzes - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quizzes' },
      { status: 500 }
    );
  }
}
