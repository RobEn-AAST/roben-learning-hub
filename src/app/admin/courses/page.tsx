import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CoursesListClient } from '@/components/admin/CoursesListClient';
import type { Course } from '@/services/coursesService';

export const dynamic = 'force-dynamic';

export default async function CoursesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch courses with module and lesson counts using admin-level server client
  const { data: courses, error } = await supabase
    .from('courses')
    .select(`
      id,
      slug,
      title,
      description,
      cover_image,
      status,
      created_by,
      created_at,
      updated_at,
      metadata
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch courses:', error);
  }

  // Fetch module counts per course
  const { data: modules } = await supabase
    .from('modules')
    .select('course_id, id');

  // Build module count map
  const moduleCountMap: Record<string, number> = {};
  const moduleCourseIds: string[] = [];
  (modules || []).forEach((m) => {
    moduleCountMap[m.course_id] = (moduleCountMap[m.course_id] || 0) + 1;
    moduleCourseIds.push(m.course_id);
  });

  // Fetch lesson counts by joining through modules
  const { data: lessons } = await supabase
    .from('lessons')
    .select('module_id, modules!inner(course_id)');

  // Build lesson count map
  const lessonCountMap: Record<string, number> = {};
  (lessons || []).forEach((l: any) => {
    const courseId = l.modules?.course_id;
    if (courseId) {
      lessonCountMap[courseId] = (lessonCountMap[courseId] || 0) + 1;
    }
  });

  // Enrich courses with counts
  const enrichedCourses: (Course & { module_count: number; lesson_count: number })[] = (
    courses || []
  ).map((course: Course) => ({
    ...course,
    module_count: moduleCountMap[course.id] || 0,
    lesson_count: lessonCountMap[course.id] || 0,
  }));

  return <CoursesListClient courses={enrichedCourses} />;
}
