import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/adminHelpers';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Create admin client for full visibility
    const adminClient = createAdminClient();

    // Check existing assignments (admin view)
    const { data: assignments, error: assignmentsError } = await adminClient
      .from('course_instructors')
      .select(`
        id,
        course_id,
        instructor_id,
        assigned_at,
        courses(id, title, status)
      `);

    // Get all courses to see what's available (admin view)
    const { data: allCourses, error: coursesError } = await adminClient
      .from('courses')
      .select('id, title, status');

    // Get courses this instructor can see (via RLS)
    const { data: accessibleCourses, error: accessibleError } = await supabase
      .from('courses')
      .select('id, title, status');

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        profile
      },
      assignments: assignments || [],
      allCourses: allCourses || [],
      accessibleCourses: accessibleCourses || [],
      errors: {
        profile: profileError ? (profileError as any).message : null,
        assignments: assignmentsError ? (assignmentsError as any).message : null,
        courses: coursesError ? (coursesError as any).message : null,
        accessible: accessibleError ? (accessibleError as any).message : null
      }
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { courseId, instructorId } = await request.json();
    
    const supabase = await createClient();

    // Get current user (must be admin)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Create assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('course_instructors')
      .insert({
        course_id: courseId,
        instructor_id: instructorId
      })
      .select(`
        id,
        course_id,
        instructor_id,
        assigned_at,
        courses(title),
        profiles!course_instructors_instructor_id_fkey(full_name)
      `)
      .single();

    if (assignmentError) {
      return NextResponse.json({ error: assignmentError.message }, { status: 400 });
    }

    return NextResponse.json({ assignment });

  } catch (error) {
    console.error('Assignment creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}