import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, getAllowedInstructorCourseIds } from '@/lib/adminHelpers';

export const dynamic = 'force-dynamic';

// GET: Get courses assigned to the instructor
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Compute allowed courses via helper (covers lessons.instructor_id and course_instructors)
    const courseIds = await getAllowedInstructorCourseIds(user.id);
    if (!courseIds.length) {
      return NextResponse.json([]);
    }

    // Fetch minimal course data using admin client to avoid RLS issues
    const admin = createAdminClient();
    const { data: courses, error } = await admin
      .from('courses')
      .select('id, title, description, status, created_at')
      .in('id', courseIds);

    if (error) {
      console.error('Error fetching instructor courses:', error);
      return NextResponse.json(
        { error: 'Failed to fetch courses' },
        { status: 500 }
      );
    }

    // Courses are already unique by id
    return NextResponse.json(courses || []);

  } catch (error) {
    console.error('Error in GET /api/instructor/courses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
