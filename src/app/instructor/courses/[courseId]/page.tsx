import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { createAdminClient, getAllowedInstructorCourseIds } from '@/lib/adminHelpers';
import { CourseViewClient } from '@/components/admin/CourseViewClient';

export const dynamic = 'force-dynamic';

export default async function InstructorCourseViewPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Verify instructor is assigned to this course
  const allowedIds = await getAllowedInstructorCourseIds(user.id);
  if (!allowedIds.includes(courseId)) notFound();

  const admin = createAdminClient();

  const { data: course, error } = await admin
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();

  if (error || !course) notFound();

  const { data: modules } = await admin
    .from('modules')
    .select('*')
    .eq('course_id', courseId)
    .order('position');

  const moduleIds = (modules || []).map((m: { id: string }) => m.id);

  let lessons: any[] = [];
  if (moduleIds.length > 0) {
    const { data: lessonRows } = await admin
      .from('lessons')
      .select('id, module_id, title, lesson_type, position, status')
      .in('module_id', moduleIds)
      .order('position');
    lessons = lessonRows || [];
  }

  const modulesWithLessons = (modules || []).map((mod: any) => ({
    ...mod,
    lessons: lessons.filter((l: any) => l.module_id === mod.id),
  }));

  return (
    <CourseViewClient
      course={course}
      modules={modulesWithLessons}
      mode="instructor"
    />
  );
}
