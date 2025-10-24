import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Get total quizzes count
    const { count: totalQuizzes } = await supabase
      .from('quizzes')
      .select('*', { count: 'exact', head: true });

    // Get total questions count
    const { count: totalQuestions } = await supabase
      .from('quiz_questions')
      .select('*', { count: 'exact', head: true });

    // Get quizzes with time limits
    const { count: quizzesWithTimeLimit } = await supabase
      .from('quizzes')
      .select('*', { count: 'exact', head: true })
      .not('time_limit_minutes', 'is', null);

    // Get quiz-type lessons
    const { count: quizLessons } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true })
      .eq('lesson_type', 'quiz');

    const stats = {
      total_quizzes: totalQuizzes || 0,
      total_questions: totalQuestions || 0,
      quizzes_with_time_limit: quizzesWithTimeLimit || 0,
      quiz_lessons: quizLessons || 0,
      available_lessons: (quizLessons || 0) - (totalQuizzes || 0)
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
