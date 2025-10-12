import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// Create service role client to bypass RLS
const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    const { courseId } = await request.json();

    // Get user from authentication
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Get all course lessons if courseId provided, or all lessons for user
    let lessonIds: string[] = [];
    
    if (courseId) {
      // Get lessons for specific course
      const { data: modules } = await supabaseAdmin
        .from('modules')
        .select(`
          lessons (
            id
          )
        `)
        .eq('course_id', courseId);
      
      lessonIds = modules?.flatMap(m => m.lessons.map((l: any) => l.id)) || [];
    }

    // Find duplicate progress records for the user
    const { data: progressRecords } = await supabaseAdmin
      .from('lesson_progress')
      .select('id, lesson_id, user_id, status, created_at')
      .eq('user_id', userId)
      .order('lesson_id, created_at');

    if (!progressRecords) {
      return NextResponse.json({ error: 'No progress records found' }, { status: 404 });
    }

    // Group by lesson_id to find duplicates
    const lessonGroups: Record<string, any[]> = {};
    progressRecords.forEach(record => {
      if (!lessonGroups[record.lesson_id]) {
        lessonGroups[record.lesson_id] = [];
      }
      lessonGroups[record.lesson_id].push(record);
    });

    // Find duplicates and orphaned records
    const duplicates: string[] = [];
    const orphaned: string[] = [];
    const toDelete: string[] = [];

    Object.entries(lessonGroups).forEach(([lessonId, records]) => {
      if (records.length > 1) {
        // Keep the most recent record, mark others for deletion
        records.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const [keep, ...remove] = records;
        toDelete.push(...remove.map(r => r.id));
        duplicates.push(lessonId);
      }

      // Check if lesson still exists (if courseId provided)
      if (courseId && lessonIds.length > 0 && !lessonIds.includes(lessonId)) {
        orphaned.push(lessonId);
        toDelete.push(...records.map(r => r.id));
      }
    });

    // Delete duplicate and orphaned records
    let deletedCount = 0;
    if (toDelete.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from('lesson_progress')
        .delete()
        .in('id', toDelete);

      if (deleteError) {
        console.error('Error deleting progress records:', deleteError);
        return NextResponse.json({ 
          error: 'Failed to clean progress records', 
          details: deleteError.message 
        }, { status: 500 });
      }

      deletedCount = toDelete.length;
    }

    // Get updated progress summary
    const { data: cleanProgress } = await supabaseAdmin
      .from('lesson_progress')
      .select('lesson_id')
      .eq('user_id', userId)
      .eq('status', 'completed');

    let totalLessons = 0;
    if (courseId) {
      // Recalculate total lessons for the course
      const { data: courseModules } = await supabaseAdmin
        .from('modules')
        .select(`
          lessons!inner (
            id
          )
        `)
        .eq('course_id', courseId);

      totalLessons = courseModules?.reduce((acc, module) => acc + (module.lessons?.length || 0), 0) || 0;
    }

    return NextResponse.json({
      success: true,
      cleanup: {
        duplicatesFound: duplicates.length,
        orphanedFound: orphaned.length,
        recordsDeleted: deletedCount,
        duplicateLessons: duplicates,
        orphanedLessons: orphaned
      },
      updatedProgress: {
        completedLessons: cleanProgress?.length || 0,
        totalLessons: totalLessons,
        percentage: totalLessons > 0 ? Math.round(((cleanProgress?.length || 0) / totalLessons) * 100) : 0
      }
    });

  } catch (error) {
    console.error('Error cleaning progress:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const courseId = searchParams.get('courseId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Analyze progress records for issues
    const { data: progressRecords } = await supabaseAdmin
      .from('lesson_progress')
      .select('id, lesson_id, user_id, status, created_at')
      .eq('user_id', userId);

    if (!progressRecords) {
      return NextResponse.json({ progress: [], issues: [] });
    }

    // Group by lesson_id to analyze
    const lessonGroups: Record<string, any[]> = {};
    progressRecords.forEach(record => {
      if (!lessonGroups[record.lesson_id]) {
        lessonGroups[record.lesson_id] = [];
      }
      lessonGroups[record.lesson_id].push(record);
    });

    const issues: any[] = [];
    Object.entries(lessonGroups).forEach(([lessonId, records]) => {
      if (records.length > 1) {
        issues.push({
          type: 'duplicate',
          lessonId,
          count: records.length,
          records: records.map(r => ({ id: r.id, createdAt: r.created_at }))
        });
      }
    });

    return NextResponse.json({
      totalRecords: progressRecords.length,
      uniqueLessons: Object.keys(lessonGroups).length,
      issues,
      needsCleanup: issues.length > 0
    });

  } catch (error) {
    console.error('Error analyzing progress:', error);
    return NextResponse.json({
      error: (error as Error).message
    }, { status: 500 });
  }
}