import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    console.log('🔵 Step 1: API route called');
    
    const supabase = await createClient();
    const { quizId } = await params;
    
    console.log('🔵 Step 2: Getting user...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('🔴 Auth error:', authError);
      return NextResponse.json({ error: 'Auth failed', details: authError.message }, { status: 401 });
    }

    if (!user) {
      console.error('🔴 No user found');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('🔵 Step 3: User authenticated:', user.id);

    const body = await request.json();
    console.log('🔵 Step 4: Request body received');
    
    const { answers, timeSpent } = body;

    console.log('🔵 Step 5: Quiz ID:', quizId);
    console.log('🔵 Step 6: Fetching quiz from database...');

    // Get quiz details
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select(`
        *,
        questions (
          id,
          content,
          type,
          points,
          question_options (
            id,
            content,
            is_correct
          )
        )
      `)
      .eq('id', quizId)
      .single();

    if (quizError) {
      console.error('🔴 Quiz fetch error:', quizError);
      return NextResponse.json({ 
        error: 'Database error', 
        details: quizError.message 
      }, { status: 500 });
    }

    if (!quiz) {
      console.error('🔴 Quiz not found');
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    console.log('🔵 Step 7: Quiz found:', quiz.title);
    console.log('🔵 Step 8: Questions count:', quiz.questions?.length || 0);

    if (!quiz.questions || quiz.questions.length === 0) {
      console.error('🔴 No questions in quiz');
      return NextResponse.json({ error: 'No questions found' }, { status: 400 });
    }

    console.log('🔵 Step 9: Calculating score...');

    // Calculate score
    let correctAnswers = 0;
    const totalQuestions = quiz.questions.length;

    for (const question of quiz.questions) {
      const userAnswer = answers[question.id];
      const correctOption = question.question_options?.find((opt: any) => opt.is_correct);
      
      if (userAnswer === correctOption?.id) {
        correctAnswers++;
      }
    }

  const percentage = (correctAnswers / totalQuestions) * 100;

  // Passing rule: only pass when every question is answered correctly.
  // This enforces "all correct" passing criteria regardless of quiz.passing_score.
  const passed = correctAnswers === totalQuestions;

    console.log('🔵 Step 10: Score calculated:', {
      correctAnswers,
      totalQuestions,
      percentage,
      passed
    });

    console.log('🔵 Step 11: Getting previous attempts...');

    // Get attempt number
    const { data: previousAttempts, error: prevError } = await supabase
      .from('quiz_attempts')
      .select('attempt_number')
      .eq('quiz_id', quizId)
      .eq('user_id', user.id)
      .order('attempt_number', { ascending: false })
      .limit(1);

    if (prevError) {
      console.log('⚠️ Previous attempts query error (might be first attempt):', prevError);
    }

    const attemptNumber = (previousAttempts?.[0]?.attempt_number || 0) + 1;
    console.log('🔵 Step 12: Attempt number:', attemptNumber);

    console.log('🔵 Step 13: Inserting attempt into database...');

    const insertData = {
      quiz_id: quizId,
      user_id: user.id,
      score: correctAnswers,
      total_questions: totalQuestions,
      percentage: percentage,
      passed: passed,
      attempt_number: attemptNumber,
      answers: answers,
      time_taken_seconds: timeSpent
    };

    // Save attempt
    const { data: attempt, error: insertError } = await supabase
      .from('quiz_attempts')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('🔴 Insert error:', insertError);
      return NextResponse.json({ 
        error: 'Failed to save attempt', 
        details: insertError.message,
        code: insertError.code
      }, { status: 500 });
    }

    console.log('✅ Step 14: Quiz attempt saved successfully!');
    console.log('✅ Attempt ID:', attempt.id);

    return NextResponse.json({
      success: true,
      score: correctAnswers,
      totalQuestions: totalQuestions,
      percentage: percentage,
      passed: passed,
      attemptNumber: attemptNumber,
      attempt: attempt
    });

  } catch (error) {
    console.error('🔴 CATCH BLOCK ERROR:', error);
    console.error('🔴 Error details:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
