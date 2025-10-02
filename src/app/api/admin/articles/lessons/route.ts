import { NextResponse } from 'next/server';
import { articleService } from '@/services/articleService';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ GET /api/admin/articles/lessons - Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role to determine which client to use
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('🔍 GET /api/admin/articles/lessons - User ID:', user.id);
    console.log('🔍 GET /api/admin/articles/lessons - User role:', profile?.role);

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // For debugging: Let's also check if this instructor is assigned to any courses
    if (profile?.role === 'instructor') {
      const { data: courseAssignments } = await supabase
        .from('course_instructors')
        .select('course_id, courses(title)')
        .eq('instructor_id', user.id);
      console.log('👨‍🏫 GET /api/admin/articles/lessons - Instructor course assignments:', courseAssignments);
    }

    // Role-based client selection
    const clientToUse = profile?.role === 'admin' ? 'admin' : 'regular';
    console.log('🎯 GET /api/admin/articles/lessons - Using client type:', clientToUse);

    const lessons = await articleService.getAvailableLessons(clientToUse);
    console.log('✅ GET /api/admin/articles/lessons - Found', lessons?.length || 0, 'lessons');
    return NextResponse.json(lessons);
  } catch (error) {
    console.error('❌ GET /api/admin/articles/lessons - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lessons' },
      { status: 500 }
    );
  }
}
