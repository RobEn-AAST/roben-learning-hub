import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/lesson-progress/stats
 * Fetch lesson progress statistics
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Total progress records
    const { count: totalCount, error: totalError } = await supabase
      .from('lesson_progress')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      console.error('❌ Error fetching total progress:', totalError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch progress stats', 
          details: totalError.message
        },
        { status: 500 }
      );
    }

    // Completed lessons
    const { count: completedCount, error: completedError } = await supabase
      .from('lesson_progress')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    if (completedError) {
      console.error('❌ Error fetching completed progress:', completedError);
    }

    // In progress lessons
    const { count: inProgressCount, error: inProgressError } = await supabase
      .from('lesson_progress')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'in_progress');

    if (inProgressError) {
      console.error('❌ Error fetching in-progress lessons:', inProgressError);
    }

    // Not started lessons
    const { count: notStartedCount, error: notStartedError } = await supabase
      .from('lesson_progress')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'not_started');

    if (notStartedError) {
      console.error('❌ Error fetching not-started lessons:', notStartedError);
    }

    // Average completion rate
    const { data: avgData, error: avgError } = await supabase
      .from('lesson_progress')
      .select('progress');

    let averageProgress = 0;
    if (!avgError && avgData && avgData.length > 0) {
      const total = avgData.reduce((sum, item) => sum + (Number(item.progress) || 0), 0);
      averageProgress = Math.round(total / avgData.length);
    }

    return NextResponse.json({
      total: totalCount || 0,
      completed: completedCount || 0,
      inProgress: inProgressCount || 0,
      notStarted: notStartedCount || 0,
      averageProgress
    });

  } catch (error) {
    console.error('❌ Unexpected error in GET /api/admin/lesson-progress/stats:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
