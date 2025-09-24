import { NextResponse } from 'next/server';
import { videoService } from '@/services/videoService';
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const stats = await videoService.getVideoStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching video stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video stats' },
      { status: 500 }
    );
  }
}
