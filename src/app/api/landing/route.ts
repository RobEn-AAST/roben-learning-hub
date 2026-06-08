import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Short-lived cache — landing data rarely changes, 30s TTL
// 100 visitors in 30s = 1 DB call instead of 600
let landingCache: { data: any; expiresAt: number } | null = null;
const CACHE_TTL = 30_000; // 30 seconds

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Authenticated users always get fresh data (includes their enrollments)
    if (user) {
      const { data, error } = await supabase.rpc('get_landing_data', { p_user_id: user.id });
      if (error) throw error;
      return NextResponse.json(data);
    }

    // Guest users — use cache to avoid hitting DB on every visit
    const now = Date.now();
    if (landingCache && landingCache.expiresAt > now) {
      return NextResponse.json(landingCache.data);
    }

    const { data, error } = await supabase.rpc('get_landing_data', { p_user_id: null });
    if (error) throw error;

    landingCache = { data, expiresAt: now + CACHE_TTL };
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch landing page data' },
      { status: 500 }
    );
  }
}
