import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// PUT - Complete a quiz attempt (calculate score and mark as completed)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    console.log('🔵 PUT /api/quiz-attempts/[attemptId] - Starting');
    
    const supabase = await createClient();
    const { attemptId } = await params;

    console.log('🔵 Attempt ID:', attemptId);

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('🔴 Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔵 User authenticated:', user.id);
    const body = await request.json();
    const { timeTakenSeconds } = body;

    console.log('🔵 Time taken:', timeTakenSeconds);

    // Verify attempt belongs to user and is not completed
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .select('id, user_id, completed_at')
      .eq('id', attemptId)
      .single();

    // Distinguish DB/query errors from "not found" so callers get correct HTTP codes.
    if (attemptError) {
      console.error('🔴 Error querying attempt:', attemptError);
      return NextResponse.json(
        { error: 'Database error fetching attempt', details: attemptError?.message },
        { status: 500 }
      );
    }

    if (!attempt) {
      console.error('� Attempt not found for id:', attemptId);
      return NextResponse.json(
        { error: 'Attempt not found' },
        { status: 404 }
      );
    }

    console.log('🔵 Attempt found:', attempt);

    if (attempt.user_id !== user.id) {
      console.error('🔴 Unauthorized - attempt belongs to different user');
      return NextResponse.json(
        { error: 'Unauthorized - This attempt does not belong to you' },
        { status: 403 }
      );
    }

    if (attempt.completed_at) {
      console.error('🔴 Attempt already completed');
      return NextResponse.json(
        { error: 'This attempt is already completed' },
        { status: 400 }
      );
    }

    console.log('🔵 Calling calculate_quiz_score...');

    // First, check if there are any user_answers for this attempt
    const { data: userAnswers, error: answersCheckError } = await supabase
      .from('user_answers')
      .select('*')
      .eq('attempt_id', attemptId);

    if (answersCheckError) {
      console.error('🔴 Error fetching user answers:', answersCheckError);
      // Not fatal: continue and let calculate_quiz_score handle the empty state,
      // but log the error for diagnostics.
    }

    console.log('🔵 User answers found:', userAnswers?.length || 0);
    if (userAnswers && userAnswers.length > 0) {
      console.log('🔵 Sample answer:', userAnswers[0]);
    } else {
      console.log('⚠️ WARNING: No user answers found for this attempt!');
    }

    // Call the database function to calculate score
    const { data: scoreData, error: scoreError } = await supabase.rpc(
      'calculate_quiz_score',
      { p_attempt_id: attemptId }
    );

    if (scoreError) {
      console.error('🔴 Error calculating score:', scoreError);
      return NextResponse.json(
        { error: 'Failed to calculate score', details: scoreError?.message },
        { status: 500 }
      );
    }

    console.log('🔵 Score calculated:', scoreData);

    console.log('🔵 Score calculated:', scoreData);

    // The calculate_quiz_score function already updated score fields (via SECURITY DEFINER)
    // Now mark the attempt as completed and set the time taken
    console.log('🔵 Marking attempt as completed...');
    
    const { data: updatedAttempt, error: updateError } = await supabase
      .from('quiz_attempts')
      .update({
        completed_at: new Date().toISOString(),
        time_taken_seconds: timeTakenSeconds || null,
      })
      .eq('id', attemptId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('🔴 Error marking attempt as completed:', updateError);
      return NextResponse.json(
        { error: 'Failed to complete attempt', details: updateError?.message },
        { status: 500 }
      );
    }

    console.log('✅ Quiz attempt completed successfully!');

    return NextResponse.json({
      success: true,
      attempt: updatedAttempt,
      score: scoreData?.[0] || updatedAttempt,
    });
  } catch (error) {
    console.error('🔴 CATCH BLOCK - Error completing quiz attempt:', error);
    console.error('🔴 Error details:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

// GET - Get specific attempt details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const supabase = await createClient();
    const { attemptId } = await params;

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
