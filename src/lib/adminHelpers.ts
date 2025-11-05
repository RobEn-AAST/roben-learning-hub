import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Create admin client with service role key to bypass RLS
export const createAdminClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

// Check admin permission using admin client to bypass RLS for role verification
export async function checkAdminPermission() {
  console.log('=== ADMIN PERMISSION CHECK START ===');
  
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  console.log('Auth check result:', {
    hasUser: !!user,
    userId: user?.id,
    userEmail: user?.email,
    authError: authError?.message
  });
  
  if (authError || !user) {
    console.log('Auth failed, returning 401');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use admin client to check if user is admin (bypass RLS for role verification)
  const adminClient = createAdminClient();
  console.log('Checking profile for user:', user.id);
  
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  console.log('Profile check result:', {
    profile,
    profileError: profileError?.message,
    hasProfile: !!profile,
    role: profile?.role
  });

  if (profileError || profile?.role !== 'admin') {
    console.error('Admin permission check failed:', { 
      userId: user.id,
      profileError: profileError?.message,
      role: profile?.role 
    });
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  console.log('Admin permission check passed for user:', user.id);

  return null;
}

// Check admin or instructor permission using admin client to bypass RLS
export async function checkAdminOrInstructorPermission() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use admin client to check if user is admin or instructor (bypass RLS)
  const adminClient = createAdminClient();
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || (profile?.role !== 'admin' && profile?.role !== 'instructor')) {
    console.error('Admin/Instructor permission check failed:', { 
      userId: user.id,
      profileError: profileError?.message,
      role: profile?.role 
    });
    return NextResponse.json({ error: 'Admin or Instructor access required' }, { status: 403 });
  }

  return null;
}

// Utility: compute all course IDs an instructor is allowed to manage.
// Covers both legacy per-lesson instructor assignment and the course_instructors M2M table.
export async function getAllowedInstructorCourseIds(userId: string): Promise<string[]> {
  const adminClient = createAdminClient();

  // 1) Courses inferred via lessons.instructor_id = userId
  const { data: lessonCourses, error: lcErr } = await adminClient
    .from('courses')
    .select('id, lessons!inner(instructor_id)')
    .eq('lessons.instructor_id', userId);

  if (lcErr) {
    console.warn('getAllowedInstructorCourseIds: error loading lesson-linked courses:', lcErr.message || lcErr);
  }

  const idsFromLessons = (lessonCourses || []).map((c: any) => c.id);

  // 2) Courses explicitly assigned via course_instructors
  // Guard in case table doesn't exist in some environments
  let idsFromAssignments: string[] = [];
  try {
    const { data: assigned, error: asgErr } = await adminClient
      .from('course_instructors')
      .select('course_id')
      .eq('instructor_id', userId)
      .eq('is_active', true);
    if (asgErr) {
      console.warn('getAllowedInstructorCourseIds: error loading course_instructors:', asgErr.message || asgErr);
    }
    idsFromAssignments = (assigned || []).map((r: any) => r.course_id);
  } catch (e) {
    // Table may not exist on some deployments; ignore
    console.warn('getAllowedInstructorCourseIds: course_instructors not available or query failed');
  }

  // Unique union
  const set = new Set<string>([...idsFromLessons, ...idsFromAssignments]);
  return Array.from(set);
}