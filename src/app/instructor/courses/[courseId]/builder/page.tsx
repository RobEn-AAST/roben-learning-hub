import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { createAdminClient, getAllowedInstructorCourseIds } from '@/lib/adminHelpers';
import { CourseBuilder } from '@/components/admin/CourseBuilder';

export const dynamic = 'force-dynamic';

export default async function InstructorCourseBuilderPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Verify this instructor is assigned to this course
  const allowedIds = await getAllowedInstructorCourseIds(user.id);
  if (!allowedIds.includes(courseId)) {
    notFound();
  }

  // Fetch full course tree (same as admin builder)
  const adminClient = createAdminClient();

  const { data: course, error: courseError } = await adminClient
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();

  if (courseError || !course) {
    notFound();
  }

  const { data: modules } = await adminClient
    .from('modules')
    .select('*')
    .eq('course_id', courseId)
    .order('position', { ascending: true });

  const moduleIds = (modules || []).map((m: { id: string }) => m.id);

  let lessons: any[] = [];
  if (moduleIds.length > 0) {
    const { data: lessonsData } = await adminClient
      .from('lessons')
      .select('*')
      .in('module_id', moduleIds)
      .order('position', { ascending: true });
    lessons = lessonsData || [];
  }

  const lessonIds = lessons.map((l: { id: string }) => l.id);

  const [articlesResult, videosResult, quizzesResult, projectsResult] =
    lessonIds.length > 0
      ? await Promise.all([
          adminClient.from('articles').select('*').in('lesson_id', lessonIds),
          adminClient.from('videos').select('*').in('lesson_id', lessonIds),
          adminClient
            .from('quizzes')
            .select(`*, questions:questions(*, options:question_options(*))`)
            .in('lesson_id', lessonIds),
          adminClient.from('projects').select('*').in('lesson_id', lessonIds),
        ])
      : [null, null, null, null];

  const articles = articlesResult?.data || [];
  const videos = videosResult?.data || [];
  const quizzes = quizzesResult?.data || [];
  const projects = projectsResult?.data || [];

  // Build content map
  const contentMap: Record<string, { article?: any; video?: any; quiz?: any; project?: any }> = {};
  for (const lesson of lessons) {
    contentMap[lesson.id] = {};
  }
  for (const article of articles) {
    if (contentMap[article.lesson_id]) contentMap[article.lesson_id].article = article;
  }
  for (const video of videos) {
    if (contentMap[video.lesson_id]) contentMap[video.lesson_id].video = video;
  }
  for (const quiz of quizzes) {
    if (contentMap[quiz.lesson_id]) contentMap[quiz.lesson_id].quiz = quiz;
  }
  for (const project of projects) {
    if (contentMap[project.lesson_id]) contentMap[project.lesson_id].project = project;
  }

  // Build modules with lessons
  const modulesWithContent = (modules || []).map((mod: any) => {
    const moduleLessons = lessons
      .filter((l: any) => l.module_id === mod.id)
      .map((l: any) => ({ ...l, content: contentMap[l.id] || {} }));
    return { ...mod, lessons: moduleLessons };
  });

  return (
    <CourseBuilder
      course={course}
      modules={modulesWithContent}
      currentUserId={user.id}
      mode="instructor"
    />
  );
}
