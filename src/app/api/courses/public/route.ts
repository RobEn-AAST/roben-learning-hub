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
    // Use the optimized function for public course listing
    const { data: courses, error, count } = await supabaseAdmin
      .rpc('get_courses_with_stats')
      .single();

    if (error) {
      console.error('Error with optimized function, falling back to direct query:', error);
      // Fallback to original method
      const { data: fallbackCourses, error: fallbackError, count: fallbackCount } = await supabaseAdmin
        .from('courses')
        .select('id, title, description, cover_image, created_at, status', { count: 'exact' })
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (fallbackError) {
        return NextResponse.json({ 
          success: false, 
          error: fallbackError.message,
          courses: [],
          count: 0
        });
      }

      return NextResponse.json({ 
        success: true, 
        courses: fallbackCourses || [], 
        count: fallbackCount || 0,
        message: `Found ${fallbackCourses?.length || 0} published courses via fallback method`
      });
    }

    // Convert array response to proper format
    const coursesArray = Array.isArray(courses) ? courses : [courses];

    return NextResponse.json({ 
      success: true, 
      courses: coursesArray, 
      count: coursesArray.length,
      message: `Found ${coursesArray.length} published courses via optimized function`
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