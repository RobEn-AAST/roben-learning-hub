import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { courseCache } from '@/lib/cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create admin client for public course data
const supabaseAdmin = createServiceClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

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

    let coursesData: any[] = [];

    if (isAuthenticated) {
      // Use the optimized function for authenticated users
      const { data, error } = await supabase
        .rpc('get_courses_with_stats', { user_uuid: user.id });

      if (error) {
        console.error('Error fetching courses with stats:', error);
        // Fallback to old method if function fails
        const [enrollmentsResult, coursesResult] = await Promise.all([
          supabase
            .from('course_enrollments')
            .select(`course_id, courses!inner (id, title, description, cover_image)`) // minimal fields
            .eq('user_id', user.id)
            .order('enrolled_at', { ascending: false }),
          supabaseAdmin
            .from('courses')
            .select('id, title, description, cover_image')
            .eq('status', 'published')
            .order('created_at', { ascending: false })
        ]);

        const enrolledCourses = enrollmentsResult.data?.map((e: any) => e.courses).filter(Boolean) || [];
        const allCourses = coursesResult.data || [];
        coursesData = allCourses.map((course: any) => ({
          id: course.id,
          title: course.title,
          description: course.description,
          cover_image: course.cover_image,
          is_enrolled: enrolledCourses.some((ec: any) => ec.id === course.id)
        }));
      } else {
        coursesData = (data || []).map((course: any) => ({
          id: course.id,
          title: course.title,
          description: course.description,
          cover_image: course.cover_image,
          is_enrolled: course.is_enrolled || false
        }));
      }
    } else {
      // Guest user - use optimized function without user context
      const { data, error } = await supabase
        .rpc('get_courses_with_stats');

      if (error) {
        console.error('Error fetching public courses:', error);
        // Fallback to old method
        const { data: publishedCourses } = await supabase
          .from('courses')
          .select('id, title, description, cover_image')
          .eq('status', 'published')
          .order('created_at', { ascending: false });
        coursesData = (publishedCourses || []).map((course: any) => ({
          id: course.id,
          title: course.title,
          description: course.description,
          cover_image: course.cover_image,
          is_enrolled: false
        }));
      } else {
        coursesData = (data || []).map((course: any) => ({
          id: course.id,
          title: course.title,
          description: course.description,
          cover_image: course.cover_image,
          is_enrolled: course.is_enrolled || false
        }));
      }
    }

    // Prepare response data
    const responseData = {
      isAuthenticated,
      courses: coursesData
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