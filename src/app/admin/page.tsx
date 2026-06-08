import { createAdminClient } from '@/lib/adminHelpers';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const admin = createAdminClient();

  // Single query — courses with nested module/lesson counts
  const { data: rawCourses } = await admin
    .from('courses')
    .select(`
      id,
      title,
      description,
      status,
      cover_image,
      slug,
      created_at,
      modules:modules(
        id,
        lessons:lessons(id)
      )
    `)
    .order('created_at', { ascending: false });

  const courses = (rawCourses || []).map((c: any) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    status: c.status,
    cover_image: c.cover_image,
    slug: c.slug,
    created_at: c.created_at,
    module_count: c.modules?.length || 0,
    lesson_count: c.modules?.reduce((sum: number, m: any) => sum + (m.lessons?.length || 0), 0) || 0,
  }));

  return <AdminDashboard courses={courses} />;
}
