import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from "next/server";

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const supabase = await createClient();
    const { courseId } = await params;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    const isAuthenticated = !authError && !!user;

    // Fetch course details using service role to bypass RLS
    const { data: course, error: courseError } = await supabaseAdmin
      .from('courses')
      .select('id, title, description')
      .eq('id', courseId)
      .eq('status', 'published')
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Fetch course modules with lessons using service role
    const { data: modules, error: modulesError } = await supabaseAdmin
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
          articles (content),
          quizzes (id),
          projects (title, description, submission_instructions, submission_platform),
          videos (url, duration_seconds, provider, provider_video_id)
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
      const { data: quizzesList } = await supabaseAdmin
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
          base.projectTitle = project?.title || null;
          base.projectDescription = project?.description || null;
          base.projectInstructions = project?.submission_instructions || null;
          base.projectPlatform = project?.submission_platform || null;
        }

        return base;
      }) || []
    })) || [];

    // Check if user is enrolled (only for authenticated users)
    let enrollment = null;
    if (isAuthenticated && user) {
      const { data: enrollmentData } = await supabase
        .from('course_enrollments')
        .select('id, enrolled_at, role')
        .eq('course_id', courseId)
        .eq('user_id', user.id)
        .single();
      enrollment = enrollmentData;
    }

    // Fetch instructor details from the first lesson's instructor
    let instructor = null;
    if (sortedModules.length > 0 && sortedModules[0].lessons?.length > 0) {
      const firstLesson = await supabaseAdmin
        .from('lessons')
        .select('instructor_id')
        .eq('id', sortedModules[0].lessons[0].id)
        .single();
      
      if (firstLesson.data?.instructor_id) {
        const { data: instructorData } = await supabaseAdmin
          .from('profiles')
          .select('id, first_name, last_name, avatar_url, bio')
          .eq('id', firstLesson.data.instructor_id)
          .single();
        instructor = instructorData;
      }
    }

    // Get enrollment count (use service role for public data)
    const { count: enrollmentCount } = await supabaseAdmin
      .from('course_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId);

    // If enrolled, get progress (only for authenticated users)
    let progress = null;
    if (enrollment && isAuthenticated && user) {
      // Only use the original method (no slug available)
      // Get all lesson IDs for this course to validate progress records
      const allLessonIds = sortedModules.flatMap(module => 
        (module.lessons || []).map(lesson => lesson.id)
      );

      // Get completed lessons - simplified logic
      const { data: completedLessons } = await supabaseAdmin
        .from('lesson_progress')
        .select('lesson_id')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      // Filter to only lessons in this course and deduplicate
      const courseCompletedLessons = new Set(
        (completedLessons || [])
          .map(p => p.lesson_id)
          .filter(lessonId => allLessonIds.includes(lessonId))
      );

      const totalLessons = allLessonIds.length;
      const completedCount = courseCompletedLessons.size;
      
      // Ensure percentage never exceeds 100%
      const percentage = totalLessons > 0 ? Math.min(100, Math.round((completedCount / totalLessons) * 100)) : 0;
      
      progress = {
        completedLessons: completedCount,
        totalLessons,
        percentage
      };
    }

    return NextResponse.json({
      course,
      modules: sortedModules || [],
      isEnrolled: !!enrollment,
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
