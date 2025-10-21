import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// Create service role client to bypass RLS
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

// GET /api/quizzes/[quizId]
// Returns quiz with its questions and options for rendering in the course player
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const supabase = await createClient();
    const { quizId } = await params;

    // Auth required
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch quiz using service role to bypass RLS
    const { data: quiz, error: quizError } = await supabaseAdmin
      .from('quizzes')
      .select('id, lesson_id, title, description, time_limit_minutes, created_at')
      .eq('id', quizId)
      .single();

    if (quizError) {
      console.error('Quiz fetch error:', quizError);
      return NextResponse.json({ 
        error: 'Failed to fetch quiz', 
        details: quizError.message 
      }, { status: 500 });
    }

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Fetch questions using service role to bypass RLS
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('questions')
      .select('id, quiz_id, content, type')
      .eq('quiz_id', quizId)
      .order('id');

    if (questionsError) {
      console.error('Questions fetch error:', questionsError);
      return NextResponse.json({ 
        error: 'Failed to fetch questions', 
        details: questionsError.message 
      }, { status: 500 });
    }

    const questionIds = (questions || []).map(q => q.id);

    // Fetch options for all questions using service role to bypass RLS
    let optionsByQuestion: Record<string, any[]> = {};
    if (questionIds.length > 0) {
      const { data: options, error: optionsError } = await supabaseAdmin
        .from('question_options')
        .select('id, question_id, content, is_correct')
        .in('question_id', questionIds);

      if (optionsError) {
        console.error('Options fetch error:', optionsError);
        return NextResponse.json({ 
          error: 'Failed to fetch question options', 
          details: optionsError.message 
        }, { status: 500 });
      }

      optionsByQuestion = (options || []).reduce((acc: Record<string, any[]>, opt: any) => {
        acc[opt.question_id] = acc[opt.question_id] || [];
        acc[opt.question_id].push({
          id: opt.id,
          questionId: opt.question_id,
          text: opt.content,
          isCorrect: opt.is_correct
        });
        return acc;
      }, {});
    }

    const payload = {
      quiz: {
        id: quiz.id,
        lessonId: quiz.lesson_id,
        title: quiz.title,
        description: quiz.description,
        timeLimitMinutes: quiz.time_limit_minutes
      },
      questions: (questions || []).map((q: any) => ({
        id: q.id,
        quizId: q.quiz_id,
        text: q.content,
        type: (q.type as 'multiple_choice' | 'short_answer' | 'true_false') || 'multiple_choice',
        options: optionsByQuestion[q.id] || [],
      })),
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Unexpected quiz API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
