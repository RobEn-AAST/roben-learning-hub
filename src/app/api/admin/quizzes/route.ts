import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  console.log('🔍 GET /api/admin/quizzes - Fetching all quizzes');
  
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

    // Use server client directly for admin operations
    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select('id, lesson_id, title, description, created_at');
    
    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 });
    }
    
    console.log(`✅ Successfully fetched ${quizzes?.length || 0} quizzes`);
    
    // Map lesson_id -> lessonId, created_at -> createdAt for frontend consistency
    const mappedQuizzes = (quizzes || []).map((q: any) => ({
      ...q,
      lessonId: q.lesson_id,
      createdAt: q.created_at,
    }));

    return NextResponse.json(mappedQuizzes);
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log('🔍 POST /api/admin/quizzes - Creating new quiz');
  
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
    const { lessonId, title, description } = body;

    console.log('📝 Creating quiz:', { lessonId, title, description });

    if (!lessonId || !title) {
      return NextResponse.json({ error: 'Missing required fields: lessonId, title' }, { status: 400 });
    }

    // Check if quiz already exists for this lesson
    const { data: existingQuiz } = await supabase
      .from('quizzes')
      .select('id')
      .eq('lesson_id', lessonId)
      .single();

    if (existingQuiz) {
      return NextResponse.json({ error: 'A quiz already exists for this lesson. Each lesson can only have one quiz.' }, { status: 400 });
    }

    const { data: quiz, error } = await supabase
      .from('quizzes')
      .insert([{
        lesson_id: lessonId,
        title,
        description: description || null
      }])
      .select('id, lesson_id, title, description, created_at')
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      if (error.message.includes('duplicate key')) {
        return NextResponse.json({ error: 'A quiz already exists for this lesson. Each lesson can only have one quiz.' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Failed to create quiz' }, { status: 500 });
    }

    console.log(`✅ Successfully created quiz: ${quiz.id}`);

    // Map lesson_id -> lessonId, created_at -> createdAt for frontend consistency
    const mappedQuiz = {
      ...quiz,
      lessonId: quiz.lesson_id,
      createdAt: quiz.created_at,
    };

    return NextResponse.json(mappedQuiz, { status: 201 });
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}