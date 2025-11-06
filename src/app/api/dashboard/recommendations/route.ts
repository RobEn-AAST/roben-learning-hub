import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Generates simple course recommendations based on progress buckets.
// Priority order: finish (80-99%), continue (<40% & started), start (0%), review (100%) -- top 3 excluding review unless needed.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    // Fetch enrolled courses (ids + minimal meta)
    const { data: enrollments, error: enrollError } = await supabase
      .from('course_enrollments')
      .select('courses!inner(id, title, description), enrolled_at')
      .eq('user_id', user.id)
      .eq('role', 'student')
      .order('enrolled_at', { ascending: true });

    if (EnrollError(enrollError)) {
      return NextResponse.json({ success: false, error: enrollError!.message }, { status: 500 });
    }

    const courseIds = (enrollments || []).map(e => (e as any).courses.id);
    if (courseIds.length === 0) {
      return NextResponse.json({ success: true, recommendations: [] });
    }

    // Fetch lessons for these courses via modules join
    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('id, modules!inner(course_id)')
      .in('modules.course_id', courseIds);

    const lessonsByCourse: Record<string, string[]> = {};
    (lessonsData || []).forEach(l => {
      const cId = (l as any).modules.course_id as string;
      if (!lessonsByCourse[cId]) lessonsByCourse[cId] = [];
      lessonsByCourse[cId].push(l.id);
    });

    const allLessonIds = Object.values(lessonsByCourse).flat();
    let progressRows: any[] = [];
    if (allLessonIds.length > 0) {
      const { data: prData } = await supabase
        .from('lesson_progress')
        .select('lesson_id, status, completed_at')
        .eq('user_id', user.id)
        .in('lesson_id', allLessonIds);
      progressRows = prData || [];
    }

    const progressMap = new Map<string, any>();
    progressRows.forEach(p => progressMap.set(p.lesson_id, p));

    type Recommendation = {
      courseId: string;
      title: string;
      type: 'finish' | 'continue' | 'start' | 'review';
      progressPercent: number;
      message: string;
    };

    const recs: Recommendation[] = [];

    (enrollments || []).forEach(e => {
      const course = (e as any).courses;
      const lessonIds = lessonsByCourse[course.id] || [];
      const total = lessonIds.length;
      let completed = 0;
      lessonIds.forEach(id => {
        const row = progressMap.get(id);
        if (row?.status === 'completed') completed++;
      });
      const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
      let type: Recommendation['type'];
      let message: string;
      if (pct === 100) {
        type = 'review';
        message = 'You completed this course. Review to reinforce learning.';
      } else if (pct >= 80) {
        type = 'finish';
        message = 'Almost there! Wrap up this course to earn completion.';
      } else if (pct === 0) {
        type = 'start';
        message = 'You enrolled but haven’t started yet. Begin now.';
      } else if (pct < 40) {
        type = 'continue';
        message = 'Early progress made—keep going to build momentum.';
      } else {
        // Mid progress not urgent; exclude to keep minimal list.
        return;
      }
      recs.push({ courseId: course.id, title: course.title, type, progressPercent: pct, message });
    });

    // Sort by priority order
    const priority = { finish: 1, continue: 2, start: 3, review: 4 } as Record<string, number>;
    recs.sort((a, b) => priority[a.type] - priority[b.type]);

    // Keep top 3 (excluding review unless no others)
    let filtered = recs.filter(r => r.type !== 'review');
    if (filtered.length === 0) filtered = recs; // allow review if nothing else
    const top = filtered.slice(0, 3);

    return NextResponse.json({ success: true, recommendations: top });
  } catch (error) {
    console.error('Recommendations endpoint error:', error);
    return NextResponse.json({ success: false, error: 'Unexpected error' }, { status: 500 });
  }
}

function EnrollError(err: any) { return !!err; }
