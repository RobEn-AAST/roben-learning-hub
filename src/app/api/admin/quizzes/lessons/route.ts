import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { quizService } from '@/services/quizService';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ GET /api/admin/quizzes/lessons - Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('🔍 GET /api/admin/quizzes/lessons - User ID:', user.id);
    console.log('🔍 GET /api/admin/quizzes/lessons - User role:', profile?.role);

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get available lessons (filtered to exclude lessons with existing quizzes)
    const lessons = await quizService.getLessons();
    console.log('✅ GET /api/admin/quizzes/lessons - Found', lessons?.length || 0, 'available quiz lessons');
    
    return NextResponse.json(lessons);
  } catch (error) {
    console.error('❌ GET /api/admin/quizzes/lessons - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lessons' },
      { status: 500 }
    );
  }
}
