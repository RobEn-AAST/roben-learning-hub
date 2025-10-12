import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role (bypasses RLS)
const supabaseAdmin = createClient(
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
    // Get all published courses using service role (bypasses RLS)
    const { data: courses, error, count } = await supabaseAdmin
      .from('courses')
      .select('id, title, description, cover_image, created_at, status', { count: 'exact' })
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        courses: [],
        count: 0
      });
    }

    return NextResponse.json({ 
      success: true, 
      courses: courses || [], 
      count: count || 0,
      message: `Found ${courses?.length || 0} published courses via service role`
    });
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message,
      courses: [],
      count: 0
    }, { status: 500 });
  }
}