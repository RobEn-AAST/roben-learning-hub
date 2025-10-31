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

    console.log('🔵 Calling calculate_quiz_score_and_complete (single RPC)...');

    // Call the new wrapper RPC which calculates score AND marks the attempt completed
    // in a single, atomic DB call. This reduces round-trips and potential row locking.
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'calculate_quiz_score_and_complete',
      { p_attempt_id: attemptId, p_time_taken_seconds: timeTakenSeconds || null }
    );

    if (rpcError) {
      console.error('🔴 Error calculating/completing score:', rpcError);
      return NextResponse.json(
        { error: 'Failed to calculate/complete score', details: rpcError?.message },
        { status: 500 }
      );
    }

    // rpcData should be an array with one row containing the returned values
    const result = Array.isArray(rpcData) && rpcData.length > 0 ? rpcData[0] : null;

    if (!result) {
      console.error('🔴 RPC returned no data for attempt:', attemptId);
      return NextResponse.json({ error: 'Failed to complete attempt' }, { status: 500 });
    }

    // The wrapper returns: earned_points, total_points, score, passed, attempt (jsonb)
    const returnedAttempt = result.attempt || null;

    console.log('✅ Quiz attempt calculated & completed (RPC).');

    return NextResponse.json({
      success: true,
      attempt: returnedAttempt,
      score: {
        earned_points: result.earned_points,
        total_points: result.total_points,
        score: result.score,
        passed: result.passed,
      },
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
