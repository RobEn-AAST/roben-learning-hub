import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  console.log(`🔍 PUT /api/admin/quiz-questions/${params.id} - Updating quiz question`);
  
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
    const { text, type } = body;

    console.log('📝 Updating quiz question:', { id: params.id, text: text?.substring(0, 50) + '...', type });

    if (!text || !type) {
      return NextResponse.json({ error: 'Missing required fields: text, type' }, { status: 400 });
    }

    // Validate type
    const allowedTypes = ['multiple_choice', 'short_answer', 'true_false'];
    if (!allowedTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid question type' }, { status: 400 });
    }

    // Update the question
    const { data: question, error } = await supabase
      .from('questions')
      .update({
        content: text,
        type: type
      })
      .eq('id', params.id)
      .select('id, quiz_id, content, type')
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json({ error: 'Failed to update quiz question' }, { status: 500 });
    }

    if (!question) {
      return NextResponse.json({ error: 'Quiz question not found' }, { status: 404 });
    }

    console.log(`✅ Successfully updated quiz question: ${question.id}`);

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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  console.log(`🔍 DELETE /api/admin/quiz-questions/${params.id} - Deleting quiz question`);
  
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

    console.log('🗑️ Deleting quiz question:', params.id);

    // First, delete all question options for this question
    const { error: optionsError } = await supabase
      .from('question_options')
      .delete()
      .eq('question_id', params.id);

    if (optionsError) {
      console.warn('⚠️ Error deleting question options:', optionsError);
      // Continue with question deletion even if options deletion fails
    }

    // Delete the question
    const { data: question, error } = await supabase
      .from('questions')
      .delete()
      .eq('id', params.id)
      .select('id')
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json({ error: 'Failed to delete quiz question' }, { status: 500 });
    }

    if (!question) {
      return NextResponse.json({ error: 'Quiz question not found' }, { status: 404 });
    }

    console.log(`✅ Successfully deleted quiz question: ${question.id}`);

    return NextResponse.json({ message: 'Quiz question deleted successfully', id: question.id });
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}