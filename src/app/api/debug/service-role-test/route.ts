import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  console.log('🔍 GET /api/debug/service-role-test - Testing with service role');
  
  try {
    // Test with service role client (bypasses RLS)
    console.log('Step 1: Creating service role client...');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({
        status: 'error',
        error: 'Missing environment variables',
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!serviceRoleKey
      });
    }
    
    const supabase = createServiceClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    console.log('✅ Service role client created');
    
    // Test with a very simple query and short timeout
    console.log('Step 2: Testing simple query with service role...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('⏰ Query timeout reached, aborting...');
      controller.abort();
    }, 5000); // 5 second timeout
    
    try {
      const startTime = Date.now();
      
      const { data, error, count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .limit(1);
      
      const queryTime = Date.now() - startTime;
      clearTimeout(timeoutId);
      
      if (error) {
        console.log('❌ Query error with service role:', error);
        return NextResponse.json({
          status: 'query_error',
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          queryTime
        });
      }
      
      console.log(`✅ Service role query successful in ${queryTime}ms`);
      
      // If that works, try the quiz tables
      console.log('Step 3: Testing quiz tables...');
      
      const quizTestStart = Date.now();
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('id, title')
        .limit(3);
      
      const quizQueryTime = Date.now() - quizTestStart;
      
      return NextResponse.json({
        status: 'success',
        profilesQuery: {
          count: count || 0,
          data: data || [],
          queryTime
        },
        quizzesQuery: {
          count: quizData?.length || 0,
          data: quizData || [],
          error: quizError?.message || null,
          queryTime: quizQueryTime
        }
      });
      
    } catch (queryError) {
      clearTimeout(timeoutId);
      const errorMessage = queryError instanceof Error ? queryError.message : 'Unknown error';
      console.log('❌ Query exception:', errorMessage);
      
      return NextResponse.json({
        status: 'timeout_or_exception',
        error: errorMessage,
        isAbortError: errorMessage.includes('AbortError'),
        step: 2
      });
    }
    
  } catch (error) {
    console.error('❌ Service role test failed:', error);
    return NextResponse.json({
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      step: 1
    }, { status: 500 });
  }
}