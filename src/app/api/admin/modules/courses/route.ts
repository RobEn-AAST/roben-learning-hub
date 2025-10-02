import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/adminHelpers';

export async function GET() {
  try {
    console.log('[MODULES COURSES API] Request received');
    
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('[MODULES COURSES API] Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or instructor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      console.log('[MODULES COURSES API] Forbidden - not admin/instructor');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log('[MODULES COURSES API] User role:', profile.role);

    // For instructors, get only their assigned courses
    // For admins, get all courses
    let courses;
    
    if (profile.role === 'admin') {
      // Admin can see all courses
      const adminClient = createAdminClient();
      const { data, error } = await adminClient
        .from('courses')
        .select('id, title, status')
        .order('title');
      
      if (error) {
        console.error('[MODULES COURSES API] Admin query error:', error);
        throw new Error(`Failed to fetch courses: ${error.message}`);
      }
      
      courses = data;
    } else {
      // Instructor can only see their assigned courses (RLS will handle this)
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, status')
        .order('title');
      
      if (error) {
        console.error('[MODULES COURSES API] Instructor query error:', error);
        throw new Error(`Failed to fetch courses: ${error.message}`);
      }
      
      courses = data;
    }

    console.log('[MODULES COURSES API] Success:', { coursesCount: courses?.length });
    return NextResponse.json(courses || []);
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}