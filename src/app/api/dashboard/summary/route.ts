import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Minimal dashboard summary for the current user: profile + enrolled courses
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Lightweight profile fields
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, avatar_url, role, created_at')
      .eq('id', user.id)
      .single();

    // Enrolled courses (student role enrollments)
    const { data: enrollmentsData } = await supabase
      .from('course_enrollments')
      .select(`
        enrolled_at,
        courses!inner (
          id,
          title,
          description,
          cover_image,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .eq('role', 'student')
      .order('enrolled_at', { ascending: false });

    const enrolledCourses = (enrollmentsData || []).map((e: any) => e.courses).filter(Boolean);

    return NextResponse.json({
      success: true,
      profile,
      enrolledCourses,
      counts: {
        totalEnrolled: enrolledCourses.length,
      },
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load dashboard' }, { status: 500 });
  }
}
