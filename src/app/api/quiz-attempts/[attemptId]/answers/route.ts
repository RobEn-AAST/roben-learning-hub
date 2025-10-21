import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST - Save an answer for a question in an attempt
export async function POST(
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
    const { questionId, selectedOptionId, textAnswer } = body;

    if (!questionId) {
      return NextResponse.json(
        { error: 'Question ID is required' },
        { status: 400 }
      );
    }

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
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (attempt.completed_at) {
      return NextResponse.json(
        { error: 'Cannot modify completed attempt' },
        { status: 400 }
      );
    }

    // Get the question details to check correctness and points
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('id, type, points, question_options(id, is_correct)')
      .eq('id', questionId)
      .single();

    if (questionError || !question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

        // Determine if answer is correct and calculate points
    let isCorrect = false;
    let pointsEarned = 0;
    
    if (question.type === 'multiple_choice' && selectedOptionId) {
      const selectedOption = question.question_options.find(
        (opt: any) => opt.id === selectedOptionId
      );
      
      console.log('🔍 Answer evaluation:', {
        questionId,
        selectedOptionId,
        selectedOption,
        allOptions: question.question_options,
        isCorrect: selectedOption?.is_correct
      });
      
      isCorrect = selectedOption?.is_correct || false;
      pointsEarned = isCorrect ? (question.points || 1) : 0;
    } else if (question.type === 'text') {
      // Text answers need manual grading
      isCorrect = false;
      pointsEarned = 0;
    }

    // Use Supabase's upsert to handle both insert and update
    // This prevents duplicates and race conditions
    const { data: answer, error } = await supabase
      .from('user_answers')
      .upsert({
        attempt_id: attemptId,
        question_id: questionId,
        selected_option_id: selectedOptionId || null,
        text_answer: textAnswer || null,
        is_correct: isCorrect,
        points_earned: pointsEarned,
        answered_at: new Date().toISOString(),
      }, {
        onConflict: 'attempt_id,question_id',
        ignoreDuplicates: false // Update existing records
      })
      .select()
      .single();

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
      answer,
    });
  } catch (error) {
    console.error('Error in POST answer:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
