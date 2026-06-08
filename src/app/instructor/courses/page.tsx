import { createClient } from '@/lib/supabase/server';
import { createAdminClient, getAllowedInstructorCourseIds } from '@/lib/adminHelpers';
import { CoursesListClient } from '@/components/admin/CoursesListClient';

export const dynamic = 'force-dynamic';

export default async function InstructorCoursesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const courseIds = await getAllowedInstructorCourseIds(user.id);

  // Single query with nested counts
  const admin = createAdminClient();
  let courses: any[] = [];

  if (courseIds.length > 0) {
    const { data } = await admin
      .from('courses')
      .select(`
        id,
        title,
        description,
        status,
        cover_image,
        created_at,
        modules:modules(
          id,
          lessons:lessons(id)
        )
      `)
      .in('id', courseIds)
      .order('created_at', { ascending: false });

    courses = (data || []).map((c: any) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      status: c.status,
      cover_image: c.cover_image,
      created_at: c.created_at,
      slug: '',
      metadata: {},
      created_by: '',
      updated_at: c.created_at,
      module_count: c.modules?.length || 0,
      lesson_count: c.modules?.reduce((sum: number, m: any) => sum + (m.lessons?.length || 0), 0) || 0,
    }));
  }

  return <CoursesListClient courses={courses} mode="instructor" />;
}
