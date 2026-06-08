import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/adminHelpers';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }


    // Get user role to determine client type
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role || 'student';
    const clientType = userRole === 'admin' ? 'admin' : 'regular';
    

    // Use admin client to bypass RLS for admin operations
    const adminClient = createAdminClient();
    const { data: options, error } = await adminClient
      .from('question_options')
      .select('id, question_id, content, is_correct');
    
    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch question options' }, { status: 500 });
    }
    
    
    // Map question_id -> questionId, content -> text, is_correct -> isCorrect
    const mappedOptions = (options || []).map((o: any) => ({
      ...o,
      questionId: o.question_id,
      text: o.content,
      isCorrect: o.is_correct,
    }));

    return NextResponse.json(mappedOptions);
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }


    // Get user role to determine client type
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role || 'student';
    const clientType = userRole === 'admin' ? 'admin' : 'regular';
    

    if (!['admin', 'instructor'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { questionId, text, isCorrect, position } = body;


    if (!questionId || !text) {
      return NextResponse.json({ error: 'Missing required fields: questionId, text' }, { status: 400 });
    }

    // If trying to set as correct, unset other correct options for this question first
    if (isCorrect) {
      await supabase
        .from('question_options')
        .update({ is_correct: false })
        .eq('question_id', questionId)
        .eq('is_correct', true);
    }

    const insertData: Record<string, any> = {
      question_id: questionId,
      content: text,
      is_correct: isCorrect || false,
    };
    if (position !== undefined) {
      insertData.position = position;
    }


    const { data: option, error } = await supabase
      .from('question_options')
      .insert([insertData])
      .select('id, question_id, content, is_correct')
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json({ error: 'Failed to create question option', details: error.message }, { status: 500 });
    }


    // Map question_id -> questionId, content -> text, is_correct -> isCorrect
    const mappedOption = {
      ...option,
      questionId: option.question_id,
      text: option.content,
      isCorrect: option.is_correct,
    };

    return NextResponse.json(mappedOption, { status: 201 });
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}