import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { projectService } from '@/services/projectService';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ GET /api/admin/projects/lessons - Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role to determine which client to use
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('🔍 GET /api/admin/projects/lessons - User ID:', user.id);
    console.log('🔍 GET /api/admin/projects/lessons - User role:', profile?.role);

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // For debugging: Let's also check if this instructor is assigned to any courses
    if (profile?.role === 'instructor') {
      const { data: courseAssignments } = await supabase
        .from('course_instructors')
        .select('course_id, courses(title)')
        .eq('instructor_id', user.id);
      console.log('👨‍🏫 GET /api/admin/projects/lessons - Instructor course assignments:', courseAssignments);
    }

    // Role-based client selection
    const clientToUse = profile?.role === 'admin' ? 'admin' : 'regular';
    console.log('🎯 GET /api/admin/projects/lessons - Using client type:', clientToUse);

    const lessons = await projectService.getLessonsForProjects(clientToUse);
    console.log('✅ GET /api/admin/projects/lessons - Found', lessons?.length || 0, 'project lessons');
    return NextResponse.json(lessons);
  } catch (error) {
    console.error('❌ GET /api/admin/projects/lessons - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lessons' },
      { status: 500 }
    );
  }
}
