import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST - Save an answer for a question in an attempt
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    console.log('🔵 POST /api/quiz-attempts/[attemptId]/answers - Starting');
    
    const supabase = await createClient();
    const { attemptId } = await params;

    console.log('🔵 Attempt ID:', attemptId);

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

    const body = await request.json();
    const { questionId, selectedOptionId, textAnswer } = body;

    console.log('🔵 Saving answer:', { questionId, selectedOptionId });

    if (!questionId) {
      console.error('🔴 No question ID provided');
      return NextResponse.json(
        { error: 'Question ID is required' },
        { status: 400 }
      );
    }

    // Verify attempt belongs to user and is not completed
    console.log('🔵 Fetching attempt from database...');
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .select('id, user_id, completed_at')
      .eq('id', attemptId)
      .single();

    console.log('🔵 Attempt query result:', { attempt, attemptError });

    if (attemptError || !attempt) {
      console.error('🔴 Attempt not found:', attemptError);
      return NextResponse.json(
        { error: 'Attempt not found', details: attemptError?.message },
        { status: 404 }
      );
    }

    console.log('🔵 Attempt found, checking ownership...');

    console.log('🔵 Attempt found, checking ownership...');

    if (attempt.user_id !== user.id) {
      console.error('🔴 Unauthorized - attempt belongs to different user');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (attempt.completed_at) {
      console.error('🔴 Attempt already completed');
      return NextResponse.json(
        { error: 'Cannot modify completed attempt' },
        { status: 400 }
      );
    }

    console.log('🔵 Fetching question details...');

    // Get the question details to check correctness and points
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('id, type, points, question_options(id, is_correct)')
      .eq('id', questionId)
      .single();

    console.log('🔵 Question query result:', { question, questionError });

    // Distinguish between DB errors and a true "not found" result so callers
    // get a meaningful status code. Some DB errors (timeouts, connection
    // problems) were being surfaced as "not found" which confused the client.
    if (questionError) {
      console.error('🔴 Error querying question:', questionError);
      // Return 500 for DB/query errors so the client can retry or surface
      // an appropriate message. Include the DB error message for debugging
      // (trimmed) but avoid returning sensitive internals in production.
      return NextResponse.json(
        { error: 'Database error fetching question', details: questionError?.message },
        { status: 500 }
      );
    }

    if (!question) {
      console.error('🔴 Question not found for id:', questionId);
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    console.log('🔵 Question found, calculating correctness...');

    // Determine if answer is correct and calculate points
    let isCorrect = false;
    let pointsEarned = 0;
    
    if ((question.type === 'multiple_choice' || question.type === 'true_false') && selectedOptionId) {
      const selectedOption = question.question_options.find(
        (opt: any) => opt.id === selectedOptionId
      );
      
      console.log('🔍 Answer evaluation:', {
        questionType: question.type,
        questionId,
        selectedOptionId,
        selectedOption,
        allOptions: question.question_options,
        isCorrect: selectedOption?.is_correct
      });
      
      isCorrect = selectedOption?.is_correct || false;
      pointsEarned = isCorrect ? (question.points || 1) : 0;
    } else if (question.type === 'short_answer') {
      // Short answer questions need manual grading
      isCorrect = false;
      pointsEarned = 0;
    }

    console.log('🔵 Final evaluation:', { isCorrect, pointsEarned });
    console.log('🔵 Upserting answer to database...');

    // Use Supabase's upsert to handle both insert and update
    // This prevents duplicates and race conditions
    // The unique constraint is on (attempt_id, question_id)
    const { data: answer, error } = await supabase
      .from('user_answers')
      .upsert(
        {
          attempt_id: attemptId,
          question_id: questionId,
          selected_option_id: selectedOptionId || null,
          text_answer: textAnswer || null,
          is_correct: isCorrect,
          points_earned: pointsEarned,
          answered_at: new Date().toISOString(),
        },
        {
          onConflict: 'attempt_id,question_id', // Specify the unique constraint columns
          ignoreDuplicates: false, // Update on conflict
        }
      )
      .select();

    console.log('🔵 Upsert result:', { answer, error });

    if (error) {
      console.error('❌ Error saving answer:', error);
      return NextResponse.json(
        { error: `Failed to save answer: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Answer saved successfully:', { questionId, isCorrect, pointsEarned });

    return NextResponse.json({
      success: true,
      answer: answer?.[0], // Return first item from array
    });
  } catch (error) {
    console.error('Error in POST answer:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
