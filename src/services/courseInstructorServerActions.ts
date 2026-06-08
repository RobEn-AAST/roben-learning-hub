import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Create admin client with service role key
const createAdminClient = () => {
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

/**
 * Server action to remove an instructor from a course (Admin only)
 */
export async function removeInstructorServerAction(
  course_id: string, 
  instructor_id: string
): Promise<boolean> {
  
  // Get current user from session
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('Unauthorized');
  }

  // Check admin permissions using admin client to bypass RLS
  const supabaseAdmin = createAdminClient();
  
  const { data: userData, error: profileError } = await supabaseAdmin
  .from('profiles')
  .select('id, role, first_name, last_name, email')
    .eq('id', user.id)
    .single();

  if (profileError || !userData) {
    console.error('❌ User profile check failed:', profileError);
    throw new Error('User profile not found or unauthorized');
  }

  
  if (userData.role !== 'admin') {
    throw new Error('Only admins can remove instructors from courses');
  }

  // Verify the instructor assignment exists
  const { data: existingAssignment, error: checkError } = await supabaseAdmin
    .from('course_instructors')
    .select('*')
    .eq('course_id', course_id)
    .eq('instructor_id', instructor_id)
    .single();

  if (checkError || !existingAssignment) {
    console.error('❌ Assignment check failed:', checkError);
    throw new Error('Instructor assignment not found');
  }


  // Remove the instructor assignment
  const { error: removeError } = await supabaseAdmin
    .from('course_instructors')
    .delete()
    .eq('id', existingAssignment.id);

  if (removeError) {
    console.error('❌ Failed to remove instructor:', removeError);
    throw new Error(`Failed to remove instructor: ${removeError.message}`);
  }

  return true;
}

/**
 * Server action to get available instructors (Admin only)
 */
export async function getAvailableInstructorsServerAction(): Promise<Array<{
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string | null;
}>> {
  
  // Get current user from session
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('Unauthorized');
  }

  // Check admin permissions using admin client to bypass RLS
  const supabaseAdmin = createAdminClient();
  
  const { data: userData, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single();

  if (profileError || !userData || (userData.role !== 'admin' && userData.role !== 'instructor')) {
    throw new Error('Admin or instructor access required');
  }

  // Get all instructors using admin client to bypass RLS
  const { data: instructors, error: instructorsError } = await supabaseAdmin
  .from('profiles')
  .select('id, first_name, last_name, email, avatar_url')
    .eq('role', 'instructor')
    .order('first_name', { ascending: true })
    .order('last_name', { ascending: true });

  if (instructorsError) {
    console.error('❌ Failed to get instructors:', instructorsError);
    throw new Error(`Failed to get available instructors: ${instructorsError.message}`);
  }

  return instructors || [];
}

/**
 * Server action to get course instructors (Admin only)
 */
export async function getCourseInstructorsServerAction(course_id: string): Promise<Array<{
  id: string;
  course_id: string;
  instructor_id: string;
  role: string;
  assigned_at: string;
  assigned_by: string;
    instructor?: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      avatar_url: string | null;
    };
}>> {
  
  // Get current user from session
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('Unauthorized');
  }

  // Use admin client to bypass RLS
  const supabaseAdmin = createAdminClient();

  // Get course instructors first
  const { data: courseInstructors, error: instructorsError } = await supabaseAdmin
    .from('course_instructors')
    .select('id, course_id, instructor_id, role, assigned_at, assigned_by')
    .eq('course_id', course_id)
    .order('assigned_at', { ascending: false });

  if (instructorsError) {
    console.error('❌ Failed to get course instructors:', instructorsError);
    throw new Error(`Failed to get course instructors: ${instructorsError.message}`);
  }

  // Get instructor profiles separately to avoid join issues
  const result = [];
  if (courseInstructors) {
    for (const courseInstructor of courseInstructors) {
      const { data: instructorProfile, error: profileError } = await supabaseAdmin
  .from('profiles')
  .select('id, first_name, last_name, email, avatar_url')
        .eq('id', courseInstructor.instructor_id)
        .single();

      result.push({
        ...courseInstructor,
        instructor: profileError ? undefined : instructorProfile
      });
    }
  }

  return result;
}

/**
 * Server action to add an instructor to a course (Admin only)
 */
export async function addInstructorServerAction(
  course_id: string, 
  instructor_id: string
): Promise<{ id: string }> {
  
  // Get current user from session
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('Unauthorized');
  }

  // Check admin permissions using admin client to bypass RLS
  const supabaseAdmin = createAdminClient();
  
  const { data: userData, error: profileError } = await supabaseAdmin
  .from('profiles')
  .select('id, role, first_name, last_name, email')
    .eq('id', user.id)
    .single();

  if (profileError || !userData) {
    console.error('❌ User profile check failed:', profileError);
    throw new Error('User profile not found or unauthorized');
  }
  
  if (userData.role !== 'admin') {
    throw new Error('Only admins can assign instructors to courses');
  }

  // Check if instructor already exists for this course
  const { data: existingAssignment, error: checkError } = await supabaseAdmin
    .from('course_instructors')
    .select('*')
    .eq('course_id', course_id)
    .eq('instructor_id', instructor_id)
    .single();

  if (existingAssignment) {
    throw new Error('Instructor is already assigned to this course');
  }

  // Add the instructor assignment
  const { data: newAssignment, error: insertError } = await supabaseAdmin
    .from('course_instructors')
    .insert({
      course_id,
      instructor_id,
      role: 'instructor',
      assigned_by: user.id,
      assigned_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (insertError) {
    console.error('❌ Failed to add instructor:', insertError);
    throw new Error(`Failed to add instructor: ${insertError.message}`);
  }

  return { id: newAssignment.id };
}