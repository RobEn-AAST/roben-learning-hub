import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// PUT - Complete a quiz attempt (calculate score and mark as completed)
export async function PUT(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
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

    const { attemptId } = params;
    const body = await request.json();
    const { timeTakenSeconds } = body;

    // Verify attempt belongs to user and is not completed
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .select('id, user_id, completed_at')
      .eq('id', attemptId)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json(
        { error: 'Attempt not found' },
        { status: 404 }
      );
    }

    if (attempt.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - This attempt does not belong to you' },
        { status: 403 }
      );
    }

    if (attempt.completed_at) {
      return NextResponse.json(
        { error: 'This attempt is already completed' },
        { status: 400 }
      );
    }

    // Call the database function to calculate score
    const { data: scoreData, error: scoreError } = await supabase.rpc(
      'calculate_quiz_score',
      { p_attempt_id: attemptId }
    );

    if (scoreError) {
      console.error('Error calculating score:', scoreError);
      return NextResponse.json(
        { error: 'Failed to calculate score' },
        { status: 500 }
      );
    }

    // Update attempt with completion time
    const { data: updatedAttempt, error: updateError } = await supabase
      .from('quiz_attempts')
      .update({
        completed_at: new Date().toISOString(),
        time_taken_seconds: timeTakenSeconds || null,
      })
      .eq('id', attemptId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating attempt:', updateError);
      return NextResponse.json(
        { error: 'Failed to complete attempt' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      attempt: updatedAttempt,
      score: scoreData?.[0] || updatedAttempt,
    });
  } catch (error) {
    console.error('Error completing quiz attempt:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// GET - Get specific attempt details
export async function GET(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const supabase = await createClient();

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

    const { attemptId } = params;

    const { data: attempt, error } = await supabase
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
      .eq('id', attemptId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching attempt:', error);
      return NextResponse.json(
        { error: 'Attempt not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ attempt });
  } catch (error) {
    console.error('Error in GET attempt:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
