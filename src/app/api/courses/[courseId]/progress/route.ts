import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/adminHelpers';

// GET /api/courses/[courseId]/progress
export async function GET(req: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const supabase = await createAdminClient();
    // Get user from session cookie (client must be authenticated)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const courseId = params.courseId;
    // Get all lessons for the course
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id')
      .eq('course_id', courseId);
    if (lessonsError) {
      return NextResponse.json({ error: 'Failed to fetch lessons' }, { status: 500 });
    }
    const lessonIds = lessons.map((l: any) => l.id);
    // Get all progress records for this user and these lessons
    const { data: progresses, error: progressError } = await supabase
      .from('lesson_progress')
      .select('lesson_id, status')
      .eq('user_id', user.id)
      .in('lesson_id', lessonIds);
    if (progressError) {
      return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
    }
    // Build a map of lessonId -> completed
    const completedLessons = new Set(
      progresses.filter((p: any) => p.status === 'completed').map((p: any) => p.lesson_id)
    );
    return NextResponse.json({ completedLessons: Array.from(completedLessons) });
  } catch (error) {
    console.error('Error in course progress API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
