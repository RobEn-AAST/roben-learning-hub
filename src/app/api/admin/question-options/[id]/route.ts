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

    const body = await request.json();
    const { text, isCorrect, position } = body;


    if (!text) {
      return NextResponse.json({ error: 'Missing required field: text' }, { status: 400 });
    }

    // Get the current option to check its question_id
    const { data: currentOption } = await supabase
      .from('question_options')
      .select('question_id')
      .eq('id', id)
      .single();

    if (!currentOption) {
      return NextResponse.json({ error: 'Question option not found' }, { status: 404 });
    }

    // If trying to set as correct, unset other correct options for this question first
    if (isCorrect) {
      await supabase
        .from('question_options')
        .update({ is_correct: false })
        .eq('question_id', currentOption.question_id)
        .eq('is_correct', true);
    }

    // Build update object
    const updateData: Record<string, any> = {
      content: text,
      is_correct: isCorrect || false,
    };
    if (position !== undefined) {
      updateData.position = position;
    }

    // Update the question option
    const { data: option, error } = await supabase
      .from('question_options')
      .update(updateData)
      .eq('id', id)
      .select('id, question_id, content, is_correct')
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json({ error: 'Failed to update question option' }, { status: 500 });
    }

    if (!option) {
      return NextResponse.json({ error: 'Question option not found' }, { status: 404 });
    }


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


    // Delete the question option
    const { data: option, error } = await supabase
      .from('question_options')
      .delete()
      .eq('id', id)
      .select('id')
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json({ error: 'Failed to delete question option' }, { status: 500 });
    }

    if (!option) {
      return NextResponse.json({ error: 'Question option not found' }, { status: 404 });
    }


    return NextResponse.json({ message: 'Question option deleted successfully', id: option.id });
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}