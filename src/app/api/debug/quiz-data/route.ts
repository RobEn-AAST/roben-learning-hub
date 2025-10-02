import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  console.log('🔍 GET /api/debug/quiz-data - Testing quiz data access');
  
  try {
    const supabase = await createClient();
    
    // Test basic connectivity first
    console.log('Testing basic database connectivity...');
    
    // Try to get a simple count from each table
    const results = {
      connectivity: 'testing...' as string,
      quizzes: { count: 0, error: null as string | null, sample: [] as any[] },
      questions: { count: 0, error: null as string | null, sample: [] as any[] },
      question_options: { count: 0, error: null as string | null, sample: [] as any[] },
      lessons: { count: 0, error: null as string | null, sample: [] as any[] }
    };

    // Test quizzes table
    try {
      const { data: quizzes, error: quizzesError, count: quizzesCount } = await supabase
        .from('quizzes')
        .select('*', { count: 'exact' })
        .limit(3);
      
      results.quizzes = {
        count: quizzesCount || 0,
        error: quizzesError?.message || null,
        sample: quizzes || []
      };
    } catch (error) {
      results.quizzes.error = `Exception: ${error instanceof Error ? error.message : String(error)}`;
    }

    // Test questions table
    try {
      const { data: questions, error: questionsError, count: questionsCount } = await supabase
        .from('questions')
        .select('*', { count: 'exact' })
        .limit(3);
      
      results.questions = {
        count: questionsCount || 0,
        error: questionsError?.message || null,
        sample: questions || []
      };
    } catch (error) {
      results.questions.error = `Exception: ${error instanceof Error ? error.message : String(error)}`;
    }

    // Test question_options table
    try {
      const { data: options, error: optionsError, count: optionsCount } = await supabase
        .from('question_options')
        .select('*', { count: 'exact' })
        .limit(3);
      
      results.question_options = {
        count: optionsCount || 0,
        error: optionsError?.message || null,
        sample: options || []
      };
    } catch (error) {
      results.question_options.error = `Exception: ${error instanceof Error ? error.message : String(error)}`;
    }

    // Test lessons table for reference
    try {
      const { data: lessons, error: lessonsError, count: lessonsCount } = await supabase
        .from('lessons')
        .select('id, title, lesson_type', { count: 'exact' })
        .limit(3);
      
      results.lessons = {
        count: lessonsCount || 0,
        error: lessonsError?.message || null,
        sample: lessons || []
      };
    } catch (error) {
      results.lessons.error = `Exception: ${error instanceof Error ? error.message : String(error)}`;
    }

    results.connectivity = 'success';
    
    console.log('Quiz data test results:', results);
    return NextResponse.json(results);
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({ 
      connectivity: 'failed',
      error: error instanceof Error ? error.message : String(error),
      message: 'Database connectivity test failed' 
    }, { status: 500 });
  }
}