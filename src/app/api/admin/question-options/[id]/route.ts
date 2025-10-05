import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  console.log(`🔍 PUT /api/admin/question-options/${params.id} - Updating question option`);
  
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
    const { text, isCorrect } = body;

    console.log('📝 Updating question option:', { id: params.id, text: text?.substring(0, 50) + '...', isCorrect });

    if (!text) {
      return NextResponse.json({ error: 'Missing required field: text' }, { status: 400 });
    }

    // Get the current option to check its question_id
    const { data: currentOption } = await supabase
      .from('question_options')
      .select('question_id')
      .eq('id', params.id)
      .single();

    if (!currentOption) {
      return NextResponse.json({ error: 'Question option not found' }, { status: 404 });
    }

    // If trying to set as correct, check if another option is already correct for this question
    if (isCorrect) {
      const { data: existingCorrectOptions } = await supabase
        .from('question_options')
        .select('id')
        .eq('question_id', currentOption.question_id)
        .eq('is_correct', true)
        .neq('id', params.id); // Exclude the current option being updated

      if (existingCorrectOptions && existingCorrectOptions.length > 0) {
        return NextResponse.json({ 
          error: 'Another option is already marked as correct for this question. Only one correct answer is allowed per question.' 
        }, { status: 400 });
      }
    }

    // Update the question option
    const { data: option, error } = await supabase
      .from('question_options')
      .update({
        content: text,
        is_correct: isCorrect || false
      })
      .eq('id', params.id)
      .select('id, question_id, content, is_correct')
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json({ error: 'Failed to update question option' }, { status: 500 });
    }

    if (!option) {
      return NextResponse.json({ error: 'Question option not found' }, { status: 404 });
    }

    console.log(`✅ Successfully updated question option: ${option.id}`);

    // Map question_id -> questionId, content -> text, is_correct -> isCorrect
    const mappedOption = {
      ...option,
      questionId: option.question_id,
      text: option.content,
      isCorrect: option.is_correct,
    };

    return NextResponse.json(mappedOption);
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  console.log(`🔍 DELETE /api/admin/question-options/${params.id} - Deleting question option`);
  
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

    console.log('🗑️ Deleting question option:', params.id);

    // Delete the question option
    const { data: option, error } = await supabase
      .from('question_options')
      .delete()
      .eq('id', params.id)
      .select('id')
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json({ error: 'Failed to delete question option' }, { status: 500 });
    }

    if (!option) {
      return NextResponse.json({ error: 'Question option not found' }, { status: 404 });
    }

    console.log(`✅ Successfully deleted question option: ${option.id}`);

    return NextResponse.json({ message: 'Question option deleted successfully', id: option.id });
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}