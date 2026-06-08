import { createClient } from '@/lib/supabase/server';
import { createAdminClient, getAllowedInstructorCourseIds } from '@/lib/adminHelpers';
import { InstructorHomeClient } from '@/components/instructor/InstructorHomeClient';

export const dynamic = 'force-dynamic';

export default async function InstructorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Get profile with role
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('id, first_name, last_name, role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin';

  // Admins see all courses; instructors see only assigned courses
  let query = admin
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
    .order('created_at', { ascending: false });

  if (!isAdmin) {
    const courseIds = await getAllowedInstructorCourseIds(user.id);
    if (courseIds.length === 0) {
      return <InstructorHomeClient courses={[]} displayName={[profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Instructor'} />;
    }
    query = query.in('id', courseIds);
  }

  const { data } = await query;

  const courses = (data || []).map((c: any) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    status: c.status,
    cover_image: c.cover_image,
    created_at: c.created_at,
    module_count: c.modules?.length || 0,
    lesson_count: c.modules?.reduce((sum: number, m: any) => sum + (m.lessons?.length || 0), 0) || 0,
  }));

  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Instructor';

  return <InstructorHomeClient courses={courses} displayName={displayName} />;
}
