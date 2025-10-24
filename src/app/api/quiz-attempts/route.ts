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

    console.log('🔵 Checking for existing attempts...');

    // Check if user has ANY existing attempts for this quiz (complete or incomplete)
    const { data: existingAttempts } = await supabase
      .from('quiz_attempts')
      .select('id, completed_at')
      .eq('quiz_id', quizId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (existingAttempts && existingAttempts.length > 0) {
      console.log(`🔵 Found ${existingAttempts.length} existing attempt(s), will reuse the latest one`);
      
      const latestAttempt = existingAttempts[0];
      
      console.log('🔵 Deleting old answers for attempt:', latestAttempt.id);
      
      // Delete all user_answers for this attempt to start fresh
      const { error: deleteAnswersError } = await supabase
        .from('user_answers')
        .delete()
        .eq('attempt_id', latestAttempt.id);

      if (deleteAnswersError) {
        console.error('⚠️ Error deleting old answers:', deleteAnswersError);
        // Don't fail here, just log the error
      } else {
        console.log('✅ Successfully deleted old answers');
      }

      console.log('🔵 Resetting attempt to incomplete state...');
      
      // Reset the attempt to incomplete state
      const { data: resetAttempt, error: resetError } = await supabase
        .from('quiz_attempts')
        .update({
          completed_at: null,
          score: null,
          earned_points: null,
          total_points: null,
          passed: null,
          time_taken_seconds: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', latestAttempt.id)
        .select()
        .single();

      if (resetError) {
        console.error('⚠️ Error resetting attempt:', resetError);
        // If reset fails, just return the existing attempt
        console.log('🔵 Returning existing attempt without reset');
        return NextResponse.json({
          success: true,
          attempt: latestAttempt,
        });
      }

      console.log('✅ Successfully reset attempt:', resetAttempt.id);
      
      // Delete any other old attempts for this user/quiz
      if (existingAttempts.length > 1) {
        const oldAttemptIds = existingAttempts.slice(1).map(a => a.id);
        await supabase
          .from('quiz_attempts')
          .delete()
          .in('id', oldAttemptIds);
        console.log(`🔵 Deleted ${oldAttemptIds.length} old attempt(s)`);
      }
      
      return NextResponse.json({
        success: true,
        attempt: resetAttempt,
      });
    }

    console.log('🔵 No existing attempts, creating new one...');

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
      console.error('🔴 Error creating quiz attempt:', attemptError);
      return NextResponse.json(
        { error: `Failed to start quiz: ${attemptError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ New quiz attempt created:', attempt.id);

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
