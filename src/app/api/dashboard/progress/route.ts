import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Returns per-course progress for a given list of courseIds (comma-separated in query ?courseIds=)
// Minimal approach: lessons + lesson_progress only.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const courseIdsParam = url.searchParams.get('courseIds') || '';
    const courseIds = courseIdsParam.split(',').map(s => s.trim()).filter(Boolean);
    if (courseIds.length === 0) {
      return NextResponse.json({ success: true, progress: [] });
    }
    if (courseIds.length > 50) {
      return NextResponse.json({ success: false, error: 'Too many courseIds (max 50)' }, { status: 400 });
    }

    // Simple in-memory cache keyed by user + sorted courseIds
    const key = `${user.id}:${courseIds.sort().join(',')}`;
    const now = Date.now();
    // @ts-ignore attach minimal cache store to globalThis
    const store = (globalThis as any).__DASH_PROGRESS_CACHE__ || ((globalThis as any).__DASH_PROGRESS_CACHE__ = new Map());
    const cached = store.get(key);
    if (cached && (now - cached.t) < 2 * 60 * 1000) {
      return NextResponse.json({ success: true, progress: cached.data });
    }

    // Fetch lessons with course mapping via modules join
    const { data: lessonsData, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, module_id, modules!inner(course_id)')
      .in('modules.course_id', courseIds);

    if (lessonsError) {
      return NextResponse.json({ success: false, error: lessonsError.message }, { status: 500 });
    }

    const lessonsByCourse: Record<string, string[]> = {};
    (lessonsData || []).forEach(l => {
      const cId = (l as any).modules.course_id as string;
      if (!lessonsByCourse[cId]) lessonsByCourse[cId] = [];
      lessonsByCourse[cId].push(l.id);
    });

    const allLessonIds = Object.values(lessonsByCourse).flat();
    if (allLessonIds.length === 0) {
      // No lessons => zero progress
      return NextResponse.json({ success: true, progress: courseIds.map(id => ({
        courseId: id,
        totalLessons: 0,
        completedLessons: 0,
        progressPercent: 0,
        completed: false,
      })) });
    }

    // Fetch progress rows for these lessons for this user
    const { data: progressRows, error: progressError } = await supabase
      .from('lesson_progress')
      .select('lesson_id, status, completed_at')
      .eq('user_id', user.id)
      .in('lesson_id', allLessonIds);

    if (progressError) {
      return NextResponse.json({ success: false, error: progressError.message }, { status: 500 });
    }

    const progressMap = new Map<string, any>();
    (progressRows || []).forEach(p => progressMap.set(p.lesson_id, p));

    const progressResult = courseIds.map(courseId => {
      const lessonIds = lessonsByCourse[courseId] || [];
      const totalLessons = lessonIds.length;
      let completedLessons = 0;
      let firstIncompleteLessonId: string | null = null;
      for (const lid of lessonIds) {
        const row = progressMap.get(lid);
        const isCompleted = row?.status === 'completed';
        if (isCompleted) completedLessons++;
        if (!isCompleted && !firstIncompleteLessonId) firstIncompleteLessonId = lid;
      }
      const progressPercent = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
      return {
        courseId,
        totalLessons,
        completedLessons,
        progressPercent,
        completed: totalLessons > 0 && completedLessons === totalLessons,
        firstIncompleteLessonId,
      };
    });

    // Save to cache
    store.set(key, { t: now, data: progressResult });

    return NextResponse.json({ success: true, progress: progressResult });
  } catch (error) {
    console.error('Progress endpoint error:', error);
    return NextResponse.json({ success: false, error: 'Unexpected error' }, { status: 500 });
  }
}
