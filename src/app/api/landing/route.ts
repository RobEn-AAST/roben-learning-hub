import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    const isAuthenticated = !!user;

    let courses: any[] = [];
    let enrolledCourses: any[] = [];

    if (isAuthenticated) {
      // Fetch courses the user is enrolled in
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('course_enrollments')
        .select(`
          course_id,
          enrolled_at,
          courses (
            id,
            title,
            description,
            cover_image,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .order('enrolled_at', { ascending: false })
        .limit(6);

      if (enrollmentsError) {
        console.error('Error fetching enrolled courses:', enrollmentsError);
      } else {
        enrolledCourses = enrollments?.map((e: any) => e.courses).filter(Boolean) || [];
      }

      // Also fetch all published courses for browsing
      const { data: allCourses, error: coursesError } = await supabase
        .from('courses')
        .select('id, title, description, cover_image, created_at')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (coursesError) {
        console.error('Error fetching all courses:', coursesError);
      } else {
        courses = allCourses || [];
      }
    } else {
      // Guest user - fetch published courses
      const { data: publishedCourses, error: coursesError } = await supabase
        .from('courses')
        .select('id, title, description, cover_image, created_at')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(6);

      if (coursesError) {
        console.error('Error fetching courses:', coursesError);
      } else {
        courses = publishedCourses || [];
      }
    }

    // Fetch instructors (users with instructor role in course_enrollments)
    const { data: instructors, error: instructorsError } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, bio')
      .eq('role', 'instructor')
      .limit(6);

    if (instructorsError) {
      console.error('Error fetching instructors:', instructorsError);
    }

    // Fetch admins
    const { data: admins, error: adminsError } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, bio')
      .eq('role', 'admin')
      .limit(3);

    if (adminsError) {
      console.error('Error fetching admins:', adminsError);
    }

    // Get statistics
    const { count: coursesCount } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published');

    const { count: enrollmentsCount } = await supabase
      .from('course_enrollments')
      .select('*', { count: 'exact', head: true });

    const { count: lessonsCount } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      isAuthenticated,
      courses: courses || [],
      enrolledCourses: enrolledCourses || [],
      instructors: instructors || [],
      admins: admins || [],
      stats: {
        totalCourses: coursesCount || 0,
        totalEnrollments: enrollmentsCount || 0,
        totalLessons: lessonsCount || 0,
      },
    });
  } catch (error) {
    console.error('Landing page data fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch landing page data' },
      { status: 500 }
    );
  }
}
