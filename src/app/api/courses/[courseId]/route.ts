import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const supabase = await createClient();
    const { courseId } = await params;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('status', 'published')
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Fetch course modules with lessons
    const { data: modules, error: modulesError } = await supabase
      .from('modules')
      .select(`
        id,
        title,
        description,
        position,
        lessons (
          id,
          title,
          lesson_type,
          position,
          status,
          videos (
            id,
            url,
            duration_seconds,
            provider,
            provider_video_id
          ),
          articles (
            id,
            title,
            reading_time_minutes
          )
        )
      `)
      .eq('course_id', courseId)
      .order('position', { ascending: true });

    if (modulesError) {
      console.error('Error fetching modules:', modulesError);
    }

    // Transform and sort lessons within each module
    const sortedModules = modules?.map(module => ({
      ...module,
      order_index: module.position,
      lessons: module.lessons?.sort((a: any, b: any) => a.position - b.position).map((lesson: any) => {
        // Get video or article data
        const video = lesson.videos?.[0];
        const article = lesson.articles?.[0];
        
        return {
          id: lesson.id,
          title: lesson.title,
          description: '', // Not in schema
          content_type: lesson.lesson_type === 'video' ? 'video' : 'article',
          content_url: video?.url || video?.provider_video_id ? 
            (video.provider === 'youtube' ? `https://www.youtube.com/watch?v=${video.provider_video_id}` : video.url) : 
            '',
          duration: video?.duration_seconds ? Math.ceil(video.duration_seconds / 60) : (article?.reading_time_minutes || 0),
          order_index: lesson.position,
          is_preview: false // Not in schema
        };
      }) || []
    })) || [];

    // Check if user is enrolled
    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('id, enrolled_at, role')
      .eq('course_id', courseId)
      .eq('user_id', user.id)
      .single();

    // Fetch instructor details from the first lesson's instructor
    let instructor = null;
    if (sortedModules.length > 0 && sortedModules[0].lessons?.length > 0) {
      const firstLesson = await supabase
        .from('lessons')
        .select('instructor_id')
        .eq('id', sortedModules[0].lessons[0].id)
        .single();
      
      if (firstLesson.data?.instructor_id) {
        const { data: instructorData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, bio')
          .eq('id', firstLesson.data.instructor_id)
          .single();
        instructor = instructorData;
      }
    }

    // Get enrollment count
    const { count: enrollmentCount } = await supabase
      .from('course_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId);

    // If enrolled, get progress
    let progress = null;
    if (enrollment) {
      const { data: completedLessons } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      const totalLessons = sortedModules.reduce((acc, module) => acc + (module.lessons?.length || 0), 0);
      const completedCount = completedLessons?.length || 0;
      
      progress = {
        completedLessons: completedCount,
        totalLessons,
        percentage: totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0
      };
    }

    return NextResponse.json({
      course,
      modules: sortedModules,
      isEnrolled: !!enrollment,
      enrollment,
      instructor: instructor || null,
      stats: {
        enrollmentCount: enrollmentCount || 0,
        moduleCount: sortedModules.length,
        lessonCount: sortedModules.reduce((acc, module) => acc + (module.lessons?.length || 0), 0)
      },
      progress
    });

  } catch (error) {
    console.error('Error fetching course:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
