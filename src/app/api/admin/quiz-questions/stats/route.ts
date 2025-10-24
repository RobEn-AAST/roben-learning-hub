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

    // Get total questions count
    const { count: totalQuestions } = await supabase
      .from('quiz_questions')
      .select('*', { count: 'exact', head: true });

    // Get multiple choice questions count
    const { count: multipleChoiceQuestions } = await supabase
      .from('quiz_questions')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'multiple_choice');

    // Get true/false questions count
    const { count: trueFalseQuestions } = await supabase
      .from('quiz_questions')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'true_false');

    // Get total options count
    const { count: totalOptions } = await supabase
      .from('question_options')
      .select('*', { count: 'exact', head: true });

    const stats = {
      total_questions: totalQuestions || 0,
      multiple_choice_questions: multipleChoiceQuestions || 0,
      true_false_questions: trueFalseQuestions || 0,
      total_options: totalOptions || 0
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
