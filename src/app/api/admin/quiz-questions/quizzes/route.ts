import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Get all quizzes with lesson information for display
    const { data: quizzes, error } = await supabase
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
