import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/adminHelpers';

export async function GET(request: NextRequest) {
  console.log('🔍 GET /api/admin/question-options - Fetching all question options');
  
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('❌ Authentication failed:', authError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`👤 User authenticated: ${user.email} (${user.id})`);

    // Get user role to determine client type
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role || 'student';
    const clientType = userRole === 'admin' ? 'admin' : 'regular';
    
    console.log(`🔑 User role: ${userRole}, using client type: ${clientType}`);

    // Use admin client to bypass RLS for admin operations
    const adminClient = createAdminClient();
    const { data: options, error } = await adminClient
      .from('question_options')
      .select('id, question_id, content, is_correct');
    
    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch question options' }, { status: 500 });
    }
    
    console.log(`✅ Successfully fetched ${options?.length || 0} question options`);
    
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
  console.log('🔍 POST /api/admin/question-options - Creating new question option');
  
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('❌ Authentication failed:', authError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`👤 User authenticated: ${user.email} (${user.id})`);

    // Get user role to determine client type
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role || 'student';
    const clientType = userRole === 'admin' ? 'admin' : 'regular';
    
    console.log(`🔑 User role: ${userRole}, using client type: ${clientType}`);

    if (!['admin', 'instructor'].includes(userRole)) {
      console.log('❌ Insufficient permissions for user role:', userRole);
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { questionId, text, isCorrect } = body;

    console.log('📝 Creating question option:', { questionId, text: text?.substring(0, 50) + '...', isCorrect });

    if (!questionId || !text) {
      return NextResponse.json({ error: 'Missing required fields: questionId, text' }, { status: 400 });
    }

    const { data: option, error } = await supabase
      .from('question_options')
      .insert([{
        question_id: questionId,
        content: text,
        is_correct: isCorrect || false
      }])
      .select('id, question_id, content, is_correct')
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json({ error: 'Failed to create question option' }, { status: 500 });
    }

    console.log(`✅ Successfully created question option: ${option.id}`);

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