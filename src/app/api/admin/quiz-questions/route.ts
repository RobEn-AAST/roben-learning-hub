import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, getAllowedInstructorCourseIds } from '@/lib/adminHelpers';

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

    // Use admin client to bypass RLS but apply role-based scoping
    const adminClient = createAdminClient();

    let questions: any[] | null = null;
    let error: any = null;

    if (userRole === 'admin') {
      const resp = await adminClient
        .from('questions')
        .select('id, quiz_id, content, type');
      questions = resp.data;
      error = resp.error;
    } else if (userRole === 'instructor') {
      // Compute allowed quiz IDs: quizzes for lessons within allowed courses
      const courseIds = await getAllowedInstructorCourseIds(user.id);
      if (courseIds.length === 0) {
        questions = [];
      } else {
        const { data: lessons } = await adminClient
          .from('lessons')
          .select('id, modules!inner(course_id)')
          .in('modules.course_id', courseIds);
        const lessonIds = (lessons || []).map((l: any) => l.id);
        if (!lessonIds.length) {
          questions = [];
        } else {
          const { data: quizzes } = await adminClient
            .from('quizzes')
            .select('id, lesson_id')
            .in('lesson_id', lessonIds);
          const quizIds = (quizzes || []).map((q: any) => q.id);
          if (!quizIds.length) {
            questions = [];
          } else {
            const resp = await adminClient
              .from('questions')
              .select('id, quiz_id, content, type')
              .in('quiz_id', quizIds);
            questions = resp.data;
            error = resp.error;
          }
        }
      }
    } else {
      // Students or unknown roles should not access
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch quiz questions' }, { status: 500 });
    }

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
    const { quizId, text, type, points, position } = body;

    if (!quizId || !text || !type) {
      return NextResponse.json({ error: 'Missing required fields: quizId, text, type' }, { status: 400 });
    }

    // Validate type
    const allowedTypes = ['multiple_choice', 'short_answer', 'true_false'];
    if (!allowedTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid question type' }, { status: 400 });
    }

    const insertData: Record<string, any> = {
      quiz_id: quizId,
      content: text,
      type: type,
    };
    if (points !== undefined) {
      insertData.points = points;
    }
    if (position !== undefined) {
      insertData.position = position;
    }

    const { data: question, error } = await supabase
      .from('questions')
      .insert([insertData])
      .select('id, quiz_id, content, type')
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json({ error: 'Failed to create quiz question' }, { status: 500 });
    }

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