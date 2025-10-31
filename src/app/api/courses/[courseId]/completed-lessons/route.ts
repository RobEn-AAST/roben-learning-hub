import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/courses/[courseId]/completed-lessons
// Returns a list of lesson IDs completed by the current authenticated user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const supabase = await createClient();
    const { courseId } = await params;

    // Ensure user is signed in
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call the DB helper RPC created in migrations: get_completed_lessons_for_course
    // It returns rows with a single column `lesson_id` for the given user+course
    const { data, error } = await supabase.rpc('get_completed_lessons_for_course', {
      p_user_id: user.id,
      p_course_id: courseId,
    });

    if (error) {
      console.error('Error calling get_completed_lessons_for_course rpc:', error);
      return NextResponse.json({ error: 'Failed to load completed lessons' }, { status: 500 });
    }

    // Normalize response to array of ids
    const ids: string[] = Array.isArray(data)
      ? data.map((row: any) => row.lesson_id || row.id || Object.values(row)[0]).filter(Boolean)
      : [];

    return NextResponse.json({ completedLessonIds: ids });
  } catch (err) {
    console.error('Unexpected error in completed-lessons route:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
