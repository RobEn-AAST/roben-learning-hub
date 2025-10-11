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
            reading_time_minutes,
            content
          ),
          quizzes (
            id
          ),
          projects (
            id,
            submission_instructions,
            external_link
          )
        )
      `)
      .eq('course_id', courseId)
      .order('position', { ascending: true });

    if (modulesError) {
      console.error('Error fetching modules:', modulesError);
    }

    // Build a lessonId list for quiz lessons to fetch quizzes separately (more reliable with RLS)
    const quizLessonIds: string[] = [];
    (modules || []).forEach((m: any) => {
      (m.lessons || []).forEach((l: any) => {
        if (l.lesson_type === 'quiz') quizLessonIds.push(l.id);
      });
    });

    let quizzesByLesson: Record<string, string> = {};
    if (quizLessonIds.length > 0) {
      const { data: quizzesList } = await supabase
        .from('quizzes')
        .select('id, lesson_id')
        .in('lesson_id', quizLessonIds);
      (quizzesList || []).forEach((q: any) => {
        // one quiz per lesson is enforced
        quizzesByLesson[q.lesson_id] = q.id;
      });
    }

    // Transform and sort lessons within each module
    const sortedModules = modules?.map(module => ({
      ...module,
      order_index: module.position,
      lessons: module.lessons?.sort((a: any, b: any) => a.position - b.position).map((lesson: any) => {
        // Handle videos - could be array or single object
        const video = Array.isArray(lesson.videos) ? lesson.videos[0] : lesson.videos;
        const article = Array.isArray(lesson.articles) ? lesson.articles[0] : lesson.articles;
        const quiz = Array.isArray(lesson.quizzes) ? lesson.quizzes[0] : lesson.quizzes;
        const project = Array.isArray(lesson.projects) ? lesson.projects[0] : lesson.projects;

        const base: any = {
          id: lesson.id,
          title: lesson.title,
          description: '', // Not in schema
          content_type: lesson.lesson_type,
          content_url: '',
          duration: 0,
          order_index: lesson.position,
          is_preview: false,
        };

        if (lesson.lesson_type === 'video') {
          // Construct the video URL properly based on provider
          let videoUrl = '';
          if (video?.url) {
            // If we have a direct URL, use it
            videoUrl = video.url;
          } else if (video?.provider === 'youtube' && video?.provider_video_id) {
            // For YouTube videos, construct the URL from the provider_video_id
            videoUrl = `https://www.youtube.com/embed/${video.provider_video_id}`;
          }
          
          // Set the content URL and duration
          base.content_url = videoUrl;
          base.duration = video?.duration_seconds ? Math.ceil(video.duration_seconds / 60) : 0;
        }
        if (lesson.lesson_type === 'article') {
          base.content_url = base.content_url || '';
          base.duration = article?.reading_time_minutes || 0;
          base.articleContent = article?.content || null;
        }
        if (lesson.lesson_type === 'quiz') {
          base.quizId = quiz?.id || quizzesByLesson[lesson.id] || null;
        }
        if (lesson.lesson_type === 'project') {
          base.projectInstructions = project?.submission_instructions || null;
          base.projectExternalLink = project?.external_link || null;
        }

        return base;
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
