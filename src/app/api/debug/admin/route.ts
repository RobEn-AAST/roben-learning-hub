import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, checkAdminPermission } from '@/lib/adminHelpers';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('=== ADMIN DEBUG TEST ===');
    
    // Test 0: Check environment variables
    const envCheck = {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY,
      supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      nodeEnv: process.env.NODE_ENV
    };
    console.log('Environment check:', envCheck);
    
    // Test 1: Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('Auth test:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      authError: authError?.message
    });

    // Test 2: Check admin permission
    const permissionError = await checkAdminPermission();
    if (permissionError) {
      console.log('Permission check failed:', permissionError);
      return NextResponse.json({
        test: 'admin_debug',
        authOk: !!user,
        permissionOk: false,
        error: 'Permission check failed'
      });
    }

    // Test 3: Check admin client access
    const adminClient = createAdminClient();
    
    // Test admin client can query courses
    const { data: courses, error: coursesError } = await adminClient
      .from('courses')
      .select('id, title, status')
      .limit(5);

    console.log('Courses query test:', {
      coursesCount: courses?.length || 0,
      coursesError: coursesError?.message
    });

    // Test admin client can query profiles
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', user?.id)
      .single();

    console.log('Profile query test:', {
      profile,
      profileError: profileError?.message
    });

    return NextResponse.json({
      test: 'admin_debug',
      envCheck,
      authOk: !!user,
      permissionOk: true,
      user: {
        id: user?.id,
        email: user?.email
      },
      profile,
      coursesCount: courses?.length || 0,
      coursesError: coursesError?.message,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Debug test error:', error);
    
    const envCheck = {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY,
      supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      nodeEnv: process.env.NODE_ENV
    };
    
    return NextResponse.json({
      test: 'admin_debug',
      envCheck,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}