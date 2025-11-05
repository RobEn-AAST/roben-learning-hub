import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, getAllowedInstructorCourseIds } from '@/lib/adminHelpers';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or instructor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get video-type lessons; if instructor, only their lessons; exclude lessons that already have a video
    let lessonsData: any[] | null = null;
    let lessonsError: any = null;

    if (profile?.role === 'instructor') {
      const admin = createAdminClient();
      const courseIds = await getAllowedInstructorCourseIds(user.id);
      if (courseIds.length === 0) {
        lessonsData = [];
      } else {
        const resp = await admin
          .from('lessons')
          .select(`
            id,
            title,
            modules!inner(
              title,
              course_id,
              courses!inner(title)
            )
          `)
          .eq('lesson_type', 'video')
          .in('modules.course_id', courseIds)
          .order('title');
        lessonsData = resp.data as any[];
        lessonsError = (resp as any).error;
      }
    } else {
      const resp = await supabase
        .from('lessons')
        .select(`
          id,
          title,
          modules!inner(
            title,
            courses!inner(title)
          )
        `)
        .eq('lesson_type', 'video')
        .order('title');
      lessonsData = resp.data as any[];
      lessonsError = (resp as any).error;
    }
    if (lessonsError) {
      console.error('Error fetching lessons:', lessonsError);
      return NextResponse.json({ error: 'Failed to fetch lessons' }, { status: 500 });
    }

    // Get lesson IDs that already have videos
    const { data: videosData } = await supabase
      .from('videos')
      .select('lesson_id');

    const usedLessonIds = new Set((videosData || []).map((v: any) => v.lesson_id));
    const availableLessons = (lessonsData || []).filter((lesson: any) => !usedLessonIds.has(lesson.id));

    const mapped = availableLessons.map((lesson: any) => ({
      id: lesson.id,
      title: lesson.title,
      module_title: lesson.modules?.title,
      course_title: lesson.modules?.courses?.title,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Error fetching lessons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lessons' },
      { status: 500 }
    );
  }
}
