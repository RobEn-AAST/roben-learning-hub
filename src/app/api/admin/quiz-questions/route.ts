import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/adminHelpers';

export async function GET(request: NextRequest) {
  console.log('🔍 GET /api/admin/quiz-questions - Fetching all quiz questions');
  
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
    const { data: questions, error } = await adminClient
      .from('questions')
      .select('id, quiz_id, content, type');
    
    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch quiz questions' }, { status: 500 });
    }
    
    console.log(`✅ Successfully fetched ${questions?.length || 0} quiz questions`);
    
    // Map quiz_id -> quizId, content -> text for frontend consistency
    const mappedQuestions = (questions || []).map((q: any) => ({
      ...q,
      quizId: q.quiz_id,
      text: q.content,
    }));

    return NextResponse.json(mappedQuestions);
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log('🔍 POST /api/admin/quiz-questions - Creating new quiz question');
  
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
    const { quizId, text, type } = body;

    console.log('📝 Creating quiz question:', { quizId, text: text?.substring(0, 50) + '...', type });

    if (!quizId || !text || !type) {
      return NextResponse.json({ error: 'Missing required fields: quizId, text, type' }, { status: 400 });
    }

    // Validate type
    const allowedTypes = ['multiple_choice', 'short_answer', 'true_false'];
    if (!allowedTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid question type' }, { status: 400 });
    }

    const { data: question, error } = await supabase
      .from('questions')
      .insert([{
        quiz_id: quizId,
        content: text,
        type: type
      }])
      .select('id, quiz_id, content, type')
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json({ error: 'Failed to create quiz question' }, { status: 500 });
    }

    console.log(`✅ Successfully created quiz question: ${question.id}`);

    // Map quiz_id -> quizId, content -> text for frontend consistency
    const mappedQuestion = {
      ...question,
      quizId: question.quiz_id,
      text: question.content,
    };

    return NextResponse.json(mappedQuestion, { status: 201 });
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}