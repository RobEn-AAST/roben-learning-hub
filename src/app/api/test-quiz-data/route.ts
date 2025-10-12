import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// Create service role client to bypass RLS
const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET() {
  try {
    // Test basic quiz data
    const { data: quizzes, error: quizzesError } = await supabaseAdmin
      .from('quizzes')
      .select('id, title, lesson_id')
      .limit(5);

    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('questions')
      .select('id, quiz_id, content, type')
      .limit(5);

    const { data: options, error: optionsError } = await supabaseAdmin
      .from('question_options')
      .select('id, question_id, content, is_correct')
      .limit(10);

    return NextResponse.json({
      success: true,
      data: {
        quizzes: {
          count: quizzes?.length || 0,
          error: quizzesError?.message,
          sample: quizzes?.[0]
        },
        questions: {
          count: questions?.length || 0,
          error: questionsError?.message,
          sample: questions?.[0]
        },
        options: {
          count: options?.length || 0,
          error: optionsError?.message,
          sample: options?.[0]
        }
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}