import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Get courses where user is assigned as instructor
    // This queries courses that have lessons assigned to this instructor
    const { data: courses, error } = await supabase
      .from('courses')
      .select(`
        id,
        title,
        description,
        status,
        created_at,
        lessons!inner(instructor_id)
      `)
      .eq('lessons.instructor_id', user.id);

    if (error) {
      console.error('Error fetching instructor courses:', error);
      return NextResponse.json(
        { error: 'Failed to fetch courses' },
        { status: 500 }
      );
    }

    // Remove duplicate courses (since we joined with lessons)
    const uniqueCourses = courses.reduce((acc: any[], course: any) => {
      const { lessons, ...courseData } = course;
      if (!acc.find(c => c.id === courseData.id)) {
        acc.push(courseData);
      }
      return acc;
    }, []);

    return NextResponse.json(uniqueCourses);

  } catch (error) {
    console.error('Error in GET /api/instructor/courses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
