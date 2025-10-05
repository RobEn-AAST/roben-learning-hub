import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  console.log(`🔍 PUT /api/admin/quizzes/${params.id} - Updating quiz`);
  
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('❌ Authentication failed:', authError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`👤 User authenticated: ${user.email} (${user.id})`);

    // Get user role to determine permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role || 'student';
    
    console.log(`🔑 User role: ${userRole}`);

    if (!['admin', 'instructor'].includes(userRole)) {
      console.log('❌ Insufficient permissions for user role:', userRole);
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description } = body;

    console.log('📝 Updating quiz:', { id: params.id, title, description });

    if (!title) {
      return NextResponse.json({ error: 'Missing required field: title' }, { status: 400 });
    }

    // Update the quiz
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .update({
        title,
        description: description || null
      })
      .eq('id', params.id)
      .select('id, lesson_id, title, description, created_at')
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json({ error: 'Failed to update quiz' }, { status: 500 });
    }

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    console.log(`✅ Successfully updated quiz: ${quiz.id}`);

    // Map lesson_id -> lessonId, created_at -> createdAt for frontend consistency
    const mappedQuiz = {
      ...quiz,
      lessonId: quiz.lesson_id,
      createdAt: quiz.created_at,
    };

    return NextResponse.json(mappedQuiz);
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  console.log(`🔍 DELETE /api/admin/quizzes/${params.id} - Deleting quiz`);
  
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('❌ Authentication failed:', authError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`👤 User authenticated: ${user.email} (${user.id})`);

    // Get user role to determine permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role || 'student';
    
    console.log(`🔑 User role: ${userRole}`);

    if (!['admin', 'instructor'].includes(userRole)) {
      console.log('❌ Insufficient permissions for user role:', userRole);
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    console.log('🗑️ Deleting quiz:', params.id);

    // First, get all questions for this quiz
    const { data: questions } = await supabase
      .from('questions')
      .select('id')
      .eq('quiz_id', params.id);

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
        .eq('quiz_id', params.id);
      
      if (questionsError) {
        console.warn('⚠️ Error deleting questions:', questionsError);
      }
    }

    // Delete the quiz
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', params.id)
      .select('id')
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json({ error: 'Failed to delete quiz' }, { status: 500 });
    }

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    console.log(`✅ Successfully deleted quiz: ${quiz.id}`);

    return NextResponse.json({ message: 'Quiz deleted successfully', id: quiz.id });
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}