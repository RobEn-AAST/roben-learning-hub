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

    // Check user role to determine which client to use
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Role-based client selection
    const clientToUse = profile?.role === 'admin' ? 'admin' : 'regular';
    const stats = await articleService.getArticleStats(clientToUse);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('❌ GET /api/admin/articles/stats - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch article stats' },
      { status: 500 }
    );
  }
}
