import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { projectService } from '@/services/projectService';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ GET /api/admin/projects/stats - Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role to determine which client to use
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('🔍 GET /api/admin/projects/stats - User role:', profile?.role);

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Role-based client selection
    const clientToUse = profile?.role === 'admin' ? 'admin' : 'regular';
    console.log('🎯 GET /api/admin/projects/stats - Using client type:', clientToUse);

    const stats = await projectService.getProjectStats(clientToUse);
    console.log('✅ GET /api/admin/projects/stats - Stats retrieved successfully');
    return NextResponse.json(stats);
  } catch (error) {
    console.error('❌ GET /api/admin/projects/stats - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project stats' },
      { status: 500 }
    );
  }
}
