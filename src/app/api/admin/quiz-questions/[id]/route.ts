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
      // Verify this question belongs to a quiz within the instructor's assigned lessons
      const { data: questionRef } = await supabase
        .from('questions')
        .select('quiz_id')
        .eq('id', id)
        .single();

      if (!questionRef) {
        return NextResponse.json({ error: 'Quiz question not found' }, { status: 404 });
      }

      const { data: quizRef } = await supabase
        .from('quizzes')
        .select('lesson_id')
        .eq('id', questionRef.quiz_id)
        .single();

      if (!quizRef) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    const { text, type, points, position } = body;


    if (!text || !type) {
      return NextResponse.json({ error: 'Missing required fields: text, type' }, { status: 400 });
    }

    // Validate type
    const allowedTypes = ['multiple_choice', 'short_answer', 'true_false'];
    if (!allowedTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid question type' }, { status: 400 });
    }

    // Build update object
    const updateData: Record<string, any> = {
      content: text,
      type: type,
    };
    if (points !== undefined) {
      updateData.points = points;
    }
    if (position !== undefined) {
      updateData.position = position;
    }

    // Update the question
    const { data: question, error } = await supabase
      .from('questions')
      .update(updateData)
      .eq('id', id)
      .select('id, quiz_id, content, type')
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json({ error: 'Failed to update quiz question' }, { status: 500 });
    }

    if (!question) {
      return NextResponse.json({ error: 'Quiz question not found' }, { status: 404 });
    }


    // Map quiz_id -> quizId, content -> text for frontend consistency
    const mappedQuestion = {
      ...question,
      quizId: question.quiz_id,
      text: question.content,
    };

    return NextResponse.json(mappedQuestion);
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
      // Verify this question belongs to a quiz within the instructor's assigned lessons
      const { data: questionRef } = await supabase
        .from('questions')
        .select('quiz_id')
        .eq('id', id)
        .single();

      if (!questionRef) {
        return NextResponse.json({ error: 'Quiz question not found' }, { status: 404 });
      }

      const { data: quizRef } = await supabase
        .from('quizzes')
        .select('lesson_id')
        .eq('id', questionRef.quiz_id)
        .single();

      if (!quizRef) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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


    // First, delete all question options for this question
    const { error: optionsError } = await supabase
      .from('question_options')
      .delete()
      .eq('question_id', id);

    if (optionsError) {
      console.warn('⚠️ Error deleting question options:', optionsError);
      // Continue with question deletion even if options deletion fails
    }

    // Delete the question
    const { data: question, error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id)
      .select('id')
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json({ error: 'Failed to delete quiz question' }, { status: 500 });
    }

    if (!question) {
      return NextResponse.json({ error: 'Quiz question not found' }, { status: 404 });
    }


    return NextResponse.json({ message: 'Quiz question deleted successfully', id: question.id });
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}