import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(request: NextRequest, { params }: any) {
  const { id } = await params;
  
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }


    // Get user role to determine permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role || 'student';
    

    if (!['admin', 'instructor'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    if (userRole === 'instructor') {
      // Verify this quiz belongs to a lesson taught by the instructor
      const { data: quizRef } = await supabase
        .from('quizzes')
        .select('lesson_id')
        .eq('id', id)
        .single();
      if (!quizRef) {
        return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
      }
      const { data: lessonRef } = await supabase
        .from('lessons')
        .select('instructor_id')
        .eq('id', quizRef.lesson_id)
        .single();
      if (!lessonRef || lessonRef.instructor_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await request.json();
    const { title, description, timeLimitMinutes, passingScore } = body;


    if (!title) {
      return NextResponse.json({ error: 'Missing required field: title' }, { status: 400 });
    }

    // Build update object, only including fields that are explicitly provided
    const updateData: Record<string, any> = {
      title,
      description: description || null,
    };
    if (timeLimitMinutes !== undefined) {
      updateData.time_limit_minutes = timeLimitMinutes || null;
    }
    if (passingScore !== undefined) {
      updateData.passing_score = passingScore;
    }

    // Update the quiz
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .update(updateData)
      .eq('id', id)
      .select('id, lesson_id, title, description, time_limit_minutes, passing_score, created_at')
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json({ error: 'Failed to update quiz' }, { status: 500 });
    }

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }


    // Map lesson_id -> lessonId, created_at -> createdAt for frontend consistency
    const mappedQuiz = {
      ...quiz,
      lessonId: quiz.lesson_id,
      timeLimitMinutes: quiz.time_limit_minutes,
      createdAt: quiz.created_at,
    };

    return NextResponse.json(mappedQuiz);
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: any) {
  const { id } = await params;
  
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }


    // Get user role to determine permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role || 'student';
    

    if (!['admin', 'instructor'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    if (userRole === 'instructor') {
      // Verify this quiz belongs to a lesson taught by the instructor
      const { data: quizRef } = await supabase
        .from('quizzes')
        .select('lesson_id')
        .eq('id', id)
        .single();
      if (!quizRef) {
        return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
      }
      const { data: lessonRef } = await supabase
        .from('lessons')
        .select('instructor_id')
        .eq('id', quizRef.lesson_id)
        .single();
      if (!lessonRef || lessonRef.instructor_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }


    // First, get all questions for this quiz
    const { data: questions } = await supabase
      .from('questions')
      .select('id')
      .eq('quiz_id', id);

    if (questions && questions.length > 0) {
      const questionIds = questions.map(q => q.id);
      
      // Delete all question options for these questions
      const { error: optionsError } = await supabase
        .from('question_options')
        .delete()
        .in('question_id', questionIds);
      
      if (optionsError) {
        console.warn('⚠️ Error deleting question options:', optionsError);
      }
      
      // Delete all questions for this quiz
      const { error: questionsError } = await supabase
        .from('questions')
        .delete()
        .eq('quiz_id', id);
      
      if (questionsError) {
        console.warn('⚠️ Error deleting questions:', questionsError);
      }
    }

    // Delete the quiz
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', id)
      .select('id')
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json({ error: 'Failed to delete quiz' }, { status: 500 });
    }

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }


    return NextResponse.json({ message: 'Quiz deleted successfully', id: quiz.id });
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}