import { NextRequest, NextResponse } from 'next/server';
import { lessonService } from '@/services/lessonService';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or instructor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return NextResponse.json({ error: 'Admin or Instructor access required' }, { status: 403 });
    }

    const stats = await lessonService.getLessonStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching lesson stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lesson stats' },
      { status: 500 }
    );
  }
}