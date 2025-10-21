import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST - Start a new quiz attempt
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in to start a quiz' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { quizId } = body;

    if (!quizId) {
      return NextResponse.json(
        { error: 'Quiz ID is required' },
        { status: 400 }
      );
    }

    // Verify quiz exists
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, title, lesson_id')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }

    // Create new attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .insert({
        quiz_id: quizId,
        user_id: user.id,
      })
      .select()
      .single();

    if (attemptError) {
      console.error('Error creating quiz attempt:', attemptError);
      return NextResponse.json(
        { error: `Failed to start quiz: ${attemptError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      attempt,
    });
  } catch (error) {
    console.error('Error in POST quiz-attempts:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// GET - Fetch quiz attempts for a user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const quizId = searchParams.get('quizId');
    const latest = searchParams.get('latest') === 'true';

    if (!quizId) {
      return NextResponse.json(
        { error: 'Quiz ID is required' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('quiz_attempts')
      .select(`
        *,
        user_answers(
          id,
          question_id,
          selected_option_id,
          text_answer,
          is_correct,
          points_earned
        )
      `)
      .eq('quiz_id', quizId)
      .eq('user_id', user.id)
      .order('started_at', { ascending: false });

    // If latest, only get the most recent attempt
    if (latest) {
      query = query.limit(1);
    }

    const { data: attempts, error } = await query;

    if (error) {
      console.error('Error fetching quiz attempts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch attempts' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      attempts: latest && attempts ? attempts[0] : attempts,
    });
  } catch (error) {
    console.error('Error in GET quiz-attempts:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
