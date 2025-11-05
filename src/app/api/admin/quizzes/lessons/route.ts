import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, getAllowedInstructorCourseIds } from '@/lib/adminHelpers';
import { quizService } from '@/services/quizService';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ GET /api/admin/quizzes/lessons - Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('🔍 GET /api/admin/quizzes/lessons - User ID:', user.id);
    console.log('🔍 GET /api/admin/quizzes/lessons - User role:', profile?.role);

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get available lessons (exclude ones that already have quizzes)
    // Scope for instructors to their own lessons only
    if (profile?.role === 'instructor') {
      // Lessons of type quiz for courses this instructor can manage
      const admin = createAdminClient();
      const courseIds = await getAllowedInstructorCourseIds(user.id);
      if (courseIds.length === 0) return NextResponse.json([]);
      const { data: lessonsData, error: lessonsError } = await admin
        .from('lessons')
        .select(`
          id,
          title,
          modules!inner(
            id,
            title,
            course_id,
            courses!inner(
              id,
              title
            )
          )
        `)
        .eq('lesson_type', 'quiz')
        .in('modules.course_id', courseIds)
        .order('title');

      if (lessonsError) {
        console.error('❌ GET /api/admin/quizzes/lessons - Error fetching lessons:', lessonsError);
        return NextResponse.json({ error: 'Failed to fetch lessons' }, { status: 500 });
      }

      const lessonIds = (lessonsData || []).map((l: any) => l.id);
      if (!lessonIds.length) {
        return NextResponse.json([]);
      }

      const { data: quizzesData } = await supabase
        .from('quizzes')
        .select('lesson_id')
        .in('lesson_id', lessonIds);

      const usedLessonIds = new Set((quizzesData || []).map((q: any) => q.lesson_id));
      const availableLessons = (lessonsData || []).filter((l: any) => !usedLessonIds.has(l.id));

      const mapped = availableLessons.map((lesson: any) => ({
        id: lesson.id,
        title: lesson.title,
        module_title: lesson.modules?.title,
        course_title: lesson.modules?.courses?.title,
        course_id: lesson.modules?.course_id
      }));

      console.log('✅ GET /api/admin/quizzes/lessons - Found', mapped.length, 'available quiz lessons');
      return NextResponse.json(mapped);
    }

    // Admin: default behavior (no instructor scoping)
    const lessons = await quizService.getLessons();
    console.log('✅ GET /api/admin/quizzes/lessons - Found', lessons?.length || 0, 'available quiz lessons');
    return NextResponse.json(lessons);
  } catch (error) {
    console.error('❌ GET /api/admin/quizzes/lessons - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lessons' },
      { status: 500 }
    );
  }
}
