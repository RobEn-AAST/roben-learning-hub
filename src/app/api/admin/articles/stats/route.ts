import { NextResponse } from 'next/server';
import { articleService } from '@/services/articleService';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const stats = await articleService.getArticleStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching article stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch article stats' },
      { status: 500 }
    );
  }
}
