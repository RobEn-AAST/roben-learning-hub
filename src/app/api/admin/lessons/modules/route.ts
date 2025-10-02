import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/adminHelpers';

export async function GET() {
  try {
    console.log('[LESSONS MODULES API] Request received');
    
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('[LESSONS MODULES API] Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or instructor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      console.log('[LESSONS MODULES API] Forbidden - not admin/instructor');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log('[LESSONS MODULES API] User role:', profile.role);

    // For instructors, get only modules from their assigned courses
    // For admins, get all modules
    let modules;
    
    if (profile.role === 'admin') {
      // Admin can see all modules
      const adminClient = createAdminClient();
      const { data, error } = await adminClient
        .from('modules')
        .select(`
          id,
          title,
          course_id,
          courses!inner(
            id,
            title,
            status
          )
        `)
        .order('title');
      
      if (error) {
        console.error('[LESSONS MODULES API] Admin query error:', error);
        throw new Error(`Failed to fetch modules: ${error.message}`);
      }
      
      modules = data;
    } else {
      // Instructor can only see modules from their assigned courses (RLS will handle this)
      const { data, error } = await supabase
        .from('modules')
        .select(`
          id,
          title,
          course_id,
          courses!inner(
            id,
            title,
            status
          )
        `)
        .order('title');
      
      if (error) {
        console.error('[LESSONS MODULES API] Instructor query error:', error);
        throw new Error(`Failed to fetch modules: ${error.message}`);
      }
      
      modules = data;
    }

    console.log('[LESSONS MODULES API] Success:', { modulesCount: modules?.length });
    return NextResponse.json(modules || []);
  } catch (error) {
    console.error('Error fetching modules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch modules' },
      { status: 500 }
    );
  }
}