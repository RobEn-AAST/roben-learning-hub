import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  console.log('🔍 GET /api/debug/simple-test - Simple connection test');
  
  try {
    // Test 1: Can we create the client?
    console.log('Step 1: Creating Supabase client...');
    const supabase = await createClient();
    console.log('✅ Supabase client created successfully');
    
    // Test 2: Environment variables check
    console.log('Step 2: Checking environment variables...');
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log(`Environment check: URL=${hasUrl}, ANON=${hasAnonKey}, SERVICE=${hasServiceKey}`);
    
    // Test 3: Try a very simple query with timeout
    console.log('Step 3: Attempting simple query with timeout...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .abortSignal(controller.signal);
      
      clearTimeout(timeoutId);
      
      if (error) {
        console.log('❌ Query error:', error);
        return NextResponse.json({
          status: 'error',
          step: 3,
          error: error.message,
          env: { hasUrl, hasAnonKey, hasServiceKey }
        });
      }
      
      console.log('✅ Simple query successful');
      return NextResponse.json({
        status: 'success',
        step: 3,
        rowCount: data?.length || 0,
        env: { hasUrl, hasAnonKey, hasServiceKey }
      });
    } catch (queryError) {
      clearTimeout(timeoutId);
      console.log('❌ Query timeout or error:', queryError);
      return NextResponse.json({
        status: 'timeout',
        step: 3,
        error: queryError instanceof Error ? queryError.message : 'Query timeout',
        env: { hasUrl, hasAnonKey, hasServiceKey }
      });
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    return NextResponse.json({
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      step: 1
    }, { status: 500 });
  }
}