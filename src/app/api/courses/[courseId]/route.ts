import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from "next/server";

// Create service role client to bypass RLS
const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Cache configuration: prefer Redis when REDIS_URL is provided, otherwise
// fall back to a process-local in-memory Map (best-effort).
type CacheEntry = { data: any; expiresAt: number };
const CACHE_TTL_MS = 60 * 1000; // 60 seconds — matches RPC cost
const courseCache = new Map<string, CacheEntry>();

let redisClient: any = null;
let redisInitAttempted = false;

async function ensureRedis() {
  if (redisInitAttempted) return redisClient;
  redisInitAttempted = true;
  const url = process.env.REDIS_URL || process.env.REDIS_TLS_URL || process.env.REDIS_URI;
  if (!url) return null;

  try {
    const req: any = (globalThis as any).require ?? eval('require');
    const IORedis: any = req('ioredis');
    redisClient = new IORedis(url);
    redisClient.on && redisClient.on('error', (err: any) => console.warn('redis client error:', err));
    return redisClient;
  } catch (rawErr) {
    const errMsg = rawErr && (rawErr as any).message ? (rawErr as any).message : String(rawErr);
    console.warn('Redis not available, falling back to in-memory cache:', errMsg);
    redisClient = null;
    return null;
  }
}

async function getCachedData(key: string): Promise<any | null> {
  const client = await ensureRedis();
  if (client) {
    try {
      const raw = await client.get(key);
      if (raw) return JSON.parse(raw);
    } catch (e: any) {
      console.warn('Error reading from redis cache:', e?.message || e);
    }
  }
  const entry = courseCache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.data;
  return null;
}

async function setCachedData(key: string, data: any) {
  const client = await ensureRedis();
  if (client) {
    try {
      await client.set(key, JSON.stringify(data), 'EX', Math.ceil(CACHE_TTL_MS / 1000));
      return;
    } catch (e: any) {
      console.warn('Error writing to redis cache:', e?.message || e);
    }
  }
  courseCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const supabase = await createClient();
    const { courseId } = await params;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    const isAuthenticated = !authError && !!user;

    // Check if caller wants to bypass cache (student polling).
    // Skip cache READ only — don't delete the entry so other students benefit.
    const bypassCache = request.nextUrl.searchParams.has('_nocache');

    // Use user-specific cache key so enrolled users get their progress cached
    const cacheKey = `course_detail:${courseId}:${isAuthenticated ? user!.id : 'anon'}`;
    let cached = bypassCache ? null : await getCachedData(cacheKey);

    if (!cached) {
      // Single RPC call replaces 5-6 sequential queries
      const { data: rpcResult, error: rpcError } = await supabaseAdmin
        .rpc('get_course_detail', {
          p_course_id: courseId,
          p_user_id: isAuthenticated ? user!.id : null
        });

      if (rpcError) {
        console.error('RPC get_course_detail error:', rpcError);
        return NextResponse.json(
          { error: 'Failed to fetch course' },
          { status: 500 }
        );
      }

      // RPC returns { error: 'Course not found' } if course doesn't exist
      if (rpcResult?.error) {
        return NextResponse.json(
          { error: rpcResult.error },
          { status: 404 }
        );
      }

      cached = rpcResult;
      // Cache for 60s — protects DB on low-spec servers
      await setCachedData(cacheKey, cached);
    }

    // The RPC already returns the full response shape the client expects
    // Add isAuthenticated flag (RPC doesn't know this)
    return NextResponse.json({
      ...cached,
      isAuthenticated
    });

  } catch (error) {
    console.error('Error fetching course:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
