import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/lessons/progress
 * Body: { lessonIds: string[] }
 * Returns user's progress for the supplied lesson IDs in one request.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log(`[LESSON-PROGRESS-BATCH] ${new Date().toISOString()} - Request received`);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const lessonIds: string[] = Array.isArray(body?.lessonIds) ? body.lessonIds : [];

    if (!lessonIds || lessonIds.length === 0) {
      console.log('[LESSON-PROGRESS-BATCH] No lessonIds provided - returning empty progress');
      return NextResponse.json({ progress: [] });
    }

    // Fetch all progress rows for this user and the requested lesson IDs in one query
    const { data, error } = await supabase
      .from('lesson_progress')
      .select('lesson_id, status, progress, completed_at, started_at')
      .in('lesson_id', lessonIds)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching lesson progress batch:', error);
      return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
    }

    // Map results by lesson id for quick lookup on client
    const progressMap: Record<string, any> = {};
    (data || []).forEach((row: any) => {
      progressMap[row.lesson_id] = {
        lessonId: row.lesson_id,
        status: row.status,
        progress: row.progress,
        completedAt: row.completed_at,
        startedAt: row.started_at,
      };
    });

    console.log(`[LESSON-PROGRESS-BATCH] ${new Date().toISOString()} - Returning progress for ${Object.keys(progressMap).length} lessons for user=${user.id}`);
    return NextResponse.json({ progress: progressMap });
  } catch (error) {
    console.error('Unexpected error in POST /api/lessons/progress:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
