import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { courseCache } from '@/lib/cache';

export async function GET() {
  try {
    const supabase = await createClient();

    // Check if user is authenticated (quick check)
    const { data: { user } } = await supabase.auth.getUser();
    const isAuthenticated = !!user;
    
    // Create cache key based on user authentication status
    const cacheKey = isAuthenticated ? `courses_auth_${user?.id}` : 'courses_guest';
    
    // Try to get from cache first
    const cachedData = courseCache.get(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    let courses: any[] = [];
    let enrolledCourses: any[] = [];

    if (isAuthenticated) {
      // Use Promise.all to run queries in parallel for faster response
      const [enrollmentsResult, coursesResult] = await Promise.all([
        // Get enrolled courses with optimized query
        supabase
          .from('course_enrollments')
          .select(`
            course_id,
            courses!inner (
              id,
              title,
              description,
              cover_image,
              created_at
            )
          `)
          .eq('user_id', user.id)
          .order('enrolled_at', { ascending: false }),

        // Get all published courses with minimal fields
        supabase
          .from('courses')
          .select('id, title, description, cover_image, created_at')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
      ]);

      if (enrollmentsResult.error) {
        console.error('Error fetching enrolled courses:', enrollmentsResult.error);
      } else {
        enrolledCourses = enrollmentsResult.data?.map((e: any) => e.courses).filter(Boolean) || [];
      }

      if (coursesResult.error) {
        console.error('Error fetching all courses:', coursesResult.error);
      } else {
        courses = coursesResult.data || [];
      }
    } else {
      // Guest user - fetch only published courses (single optimized query)
      const { data: publishedCourses, error: coursesError } = await supabase
        .from('courses')
        .select('id, title, description, cover_image, created_at')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (coursesError) {
        console.error('Error fetching courses:', coursesError);
      } else {
        courses = publishedCourses || [];
      }
    }

    // Prepare response data
    const responseData = {
      isAuthenticated,
      courses: courses || [],
      enrolledCourses: enrolledCourses || [],
    };

    // Cache the data for 3 minutes
    courseCache.set(cacheKey, responseData, 3);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Courses data fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses data' },
      { status: 500 }
    );
  }
}