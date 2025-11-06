import { NextResponse } from 'next/server';

// Public endpoint to list admin profiles. Uses service role to bypass RLS but returns minimal, non-sensitive fields.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { createClient } = await import('@supabase/supabase-js');

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRole) {
      console.error('Missing Supabase env for public admins endpoint');
      return NextResponse.json({ success: false, error: 'Server not configured' }, { status: 500 });
    }

    // Service role client for a strictly read-only, whitelisted select
    const adminClient = createClient(url, serviceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await adminClient
      .from('profiles')
      .select('id, first_name, last_name, avatar_url, bio')
      .eq('role', 'admin')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch admins:', error.message);
      return NextResponse.json({ success: false, error: 'Failed to fetch admins' }, { status: 500 });
    }

    // Sanitize output
    const admins = (data || []).map((p) => ({
      id: p.id,
      first_name: p.first_name || null,
      last_name: p.last_name || null,
      avatar_url: p.avatar_url || null,
      bio: p.bio || null,
    }));

    return NextResponse.json({ success: true, admins });
  } catch (e) {
    console.error('Public admins endpoint error', e);
    return NextResponse.json({ success: false, error: 'Unexpected error' }, { status: 500 });
  }
}
