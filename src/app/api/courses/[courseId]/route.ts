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
type CacheEntry = { ids: string[]; expiresAt: number };
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

// Public course payload cache (course + modules + instructor + stats only)
type PublicCoursePayload = {
  course: any;
  modules: any[];
  instructor: any | null;
  stats: { enrollmentCount: number; moduleCount: number; lessonCount: number };
};
type CourseCacheEntry = { payload: PublicCoursePayload; expiresAt: number };
const COURSE_CACHE_TTL_MS = 60 * 1000; // 60s - safe on low-spec servers
const publicCourseCache = new Map<string, CourseCacheEntry>();

let redisClient: any = null;
let redisInitAttempted = false;
const completedLessonsCache = new Map<string, CacheEntry>();

async function ensureRedis() {
  if (redisInitAttempted) return redisClient;
  redisInitAttempted = true;
  const url = process.env.REDIS_URL || process.env.REDIS_TLS_URL || process.env.REDIS_URI;
  if (!url) return null;

  try {
    // Use a runtime require to avoid static TypeScript dependency on ioredis
    const req: any = (globalThis as any).require ?? eval('require');
    const IORedis: any = req('ioredis');
    redisClient = new IORedis(url);
    // optional: handle simple connection errors
    redisClient.on && redisClient.on('error', (err: any) => console.warn('redis client error:', err));
    return redisClient;
  } catch (rawErr) {
    const errMsg = rawErr && (rawErr as any).message ? (rawErr as any).message : String(rawErr);
    console.warn('Redis not available or failed to initialize, falling back to in-memory cache:', errMsg);
    redisClient = null;
    return null;
  }
}

async function getCachedIds(key: string): Promise<string[] | null> {
  const client = await ensureRedis();
  if (client) {
    try {
      const raw = await client.get(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      return null;
    } catch (rawErr) {
      const errMsg = rawErr && (rawErr as any).message ? (rawErr as any).message : String(rawErr);
      console.warn('Error reading from redis cache:', errMsg);
    }
  }

  // In-memory fallback
  const entry = completedLessonsCache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.ids;
  return null;
}

async function setCachedIds(key: string, ids: string[]) {
  const client = await ensureRedis();
  if (client) {
    try {
      await client.set(key, JSON.stringify(ids), 'EX', Math.ceil(CACHE_TTL_MS / 1000));
      return;
    } catch (rawErr) {
      const errMsg = rawErr && (rawErr as any).message ? (rawErr as any).message : String(rawErr);
      console.warn('Error writing to redis cache:', errMsg);
    }
  }

  // In-memory fallback
  try {
    completedLessonsCache.set(key, { ids, expiresAt: Date.now() + CACHE_TTL_MS });
  } catch (e) {
    // ignore
  }
}

async function getCachedCourse(key: string): Promise<PublicCoursePayload | null> {
  const client = await ensureRedis();
  if (client) {
    try {
      const raw = await client.get(key);
      if (raw) return JSON.parse(raw);
    } catch (e: any) {
      console.warn('Error reading course cache from redis:', e?.message || e);
    }
  }
  const entry = publicCourseCache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.payload;
  return null;
}

async function setCachedCourse(key: string, payload: PublicCoursePayload) {
  const client = await ensureRedis();
  if (client) {
    try {
      await client.set(key, JSON.stringify(payload), 'EX', Math.ceil(COURSE_CACHE_TTL_MS / 1000));
      return;
    } catch (e: any) {
      console.warn('Error writing course cache to redis:', e?.message || e);
    }
  }
  publicCourseCache.set(key, { payload, expiresAt: Date.now() + COURSE_CACHE_TTL_MS });
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

    // Try to serve public course payload from cache first (course/modules/instructor/stats)
    const courseCacheKey = `course_public:${courseId}`;
    let publicPayload = await getCachedCourse(courseCacheKey);

    // Compute and cache public payload if missing/expired
    if (!publicPayload) {
      // Fetch course details using service role to bypass RLS
      const { data: course, error: courseError } = await supabaseAdmin
        .from('courses')
        .select('id, title, description')
        .eq('id', courseId)
        .eq('status', 'published')
        .single();

      if (courseError || !course) {
        return NextResponse.json(
          { error: 'Course not found' },
          { status: 404 }
        );
      }

      const { data: modules, error: modulesError } = await supabaseAdmin
        .from('modules')
        .select(`
          id,
          title,
          description,
          position,
          lessons (
            id,
            title,
            lesson_type,
            position,
            articles (content),
            quizzes (id),
            projects (title, description, submission_instructions, submission_platform),
            videos (url, duration_seconds, provider, provider_video_id)
          )
        `)
        .eq('course_id', courseId)
        .order('position', { ascending: true });

      if (modulesError) {
        console.error('Error fetching modules:', modulesError);
      }

      // Build a lessonId list for quiz lessons to fetch quizzes separately (more reliable with RLS)
      const quizLessonIds: string[] = [];
      (modules || []).forEach((m: any) => {
        (m.lessons || []).forEach((l: any) => {
          if (l.lesson_type === 'quiz') quizLessonIds.push(l.id);
        });
      });

      let quizzesByLesson: Record<string, string> = {};
      if (quizLessonIds.length > 0) {
        const { data: quizzesList } = await supabaseAdmin
          .from('quizzes')
          .select('id, lesson_id')
          .in('lesson_id', quizLessonIds);
        (quizzesList || []).forEach((q: any) => {
          // one quiz per lesson is enforced
          quizzesByLesson[q.lesson_id] = q.id;
        });
      }

      const sortedModules = modules?.map(module => ({
        ...module,
        order_index: module.position,
        lessons: module.lessons?.sort((a: any, b: any) => a.position - b.position).map((lesson: any) => {
          const video = Array.isArray(lesson.videos) ? lesson.videos[0] : lesson.videos;
          const article = Array.isArray(lesson.articles) ? lesson.articles[0] : lesson.articles;
          const quiz = Array.isArray(lesson.quizzes) ? lesson.quizzes[0] : lesson.quizzes;
          const project = Array.isArray(lesson.projects) ? lesson.projects[0] : lesson.projects;

          const base: any = {
            id: lesson.id,
            title: lesson.title,
            description: '',
            content_type: lesson.lesson_type,
            lesson_type: lesson.lesson_type,
            content_url: '',
            duration: 0,
            order_index: lesson.position,
            is_preview: false,
          };

          if (lesson.lesson_type === 'video') {
            let videoUrl = '';
            if (video?.url) {
              videoUrl = video.url;
            } else if (video?.provider === 'youtube' && video?.provider_video_id) {
              videoUrl = `https://www.youtube.com/embed/${video.provider_video_id}`;
            }
            base.content_url = videoUrl;
            base.duration = video?.duration_seconds ? Math.ceil(video.duration_seconds / 60) : 0;
          }
          if (lesson.lesson_type === 'article') {
            base.content_url = base.content_url || '';
            base.duration = article?.reading_time_minutes || 0;
            base.articleContent = article?.content || null;
          }
          if (lesson.lesson_type === 'quiz') {
            base.quizId = quiz?.id || quizzesByLesson[lesson.id] || null;
          }
          if (lesson.lesson_type === 'project') {
            base.projectTitle = project?.title || null;
            base.projectDescription = project?.description || null;
            base.projectInstructions = project?.submission_instructions || null;
            base.projectPlatform = project?.submission_platform || null;
          }

          return base;
        }) || []
      })) || [];

      // Instructor (first lesson's instructor)
      let instructor = null;
      if (sortedModules.length > 0 && sortedModules[0].lessons?.length > 0) {
        const firstLesson = await supabaseAdmin
          .from('lessons')
          .select('instructor_id')
          .eq('id', sortedModules[0].lessons[0].id)
          .single();
        if (firstLesson.data?.instructor_id) {
          const { data: instructorData } = await supabaseAdmin
            .from('profiles')
            .select('id, first_name, last_name, avatar_url, bio')
            .eq('id', firstLesson.data.instructor_id)
            .single();
          instructor = instructorData || null;
        }
      }

      const { count: enrollmentCount } = await supabaseAdmin
        .from('course_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId);

      publicPayload = {
        course,
        modules: sortedModules || [],
        instructor,
        stats: {
          enrollmentCount: enrollmentCount || 0,
          moduleCount: (sortedModules || []).length,
          lessonCount: (sortedModules || []).reduce((acc, module) => acc + (module.lessons?.length || 0), 0)
        }
      };

      // Cache it for a short time to protect DB on low-spec servers
      await setCachedCourse(courseCacheKey, publicPayload);
    }

    const { course, modules: sortedModules, instructor, stats } = publicPayload!;

    // Check if user is enrolled (only for authenticated users)
    let enrollment = null;
    if (isAuthenticated && user) {
      const { data: enrollmentData } = await supabase
        .from('course_enrollments')
        .select('id, enrolled_at, role')
        .eq('course_id', courseId)
        .eq('user_id', user.id)
        .single();
      enrollment = enrollmentData;
    }

  // If enrolled, get progress (only for authenticated users)
  let progress = null;
  // We'll also compute completed lesson ids here to avoid an extra RPC and ensure consistency
  let computedCompletedLessonIds: string[] = [];
    if (enrollment && isAuthenticated && user) {
      // Only use the original method (no slug available)
      // Get all lesson IDs for this course to validate progress records
      const allLessonIds = (sortedModules as any[]).flatMap((module: any) => 
        (module.lessons || []).map((lesson: any) => lesson.id)
      );

      // Get completed lessons - simplified logic
      const { data: completedLessons } = await supabaseAdmin
        .from('lesson_progress')
        .select('lesson_id')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      // Filter to only lessons in this course and deduplicate
      const courseCompletedLessons = new Set(
        (completedLessons || [])
          .map(p => p.lesson_id)
          .filter(lessonId => allLessonIds.includes(lessonId))
      );

      const totalLessons = allLessonIds.length;
      const completedCount = courseCompletedLessons.size;
      
      // Ensure percentage never exceeds 100%
      const percentage = totalLessons > 0 ? Math.min(100, Math.round((completedCount / totalLessons) * 100)) : 0;
      
      progress = {
        completedLessons: completedCount,
        totalLessons,
        percentage
      };

      // Also provide the raw list of completed lesson IDs for the client to avoid per-lesson fetches
      computedCompletedLessonIds = Array.from(courseCompletedLessons);
    }

    // Expose completed lesson ids (derived above when enrolled). Cache briefly.
    let completedLessonIds: string[] = [];
    if (computedCompletedLessonIds.length > 0 && isAuthenticated && user) {
      completedLessonIds = computedCompletedLessonIds;
      const cacheKey = `${user.id}:${courseId}`;
      try { completedLessonsCache.set(cacheKey, { ids: completedLessonIds, expiresAt: Date.now() + CACHE_TTL_MS }); } catch {}
    }

    return NextResponse.json({
      course,
      modules: sortedModules || [],
      isEnrolled: !!enrollment,
      isAuthenticated,
      enrollment,
      instructor: instructor || null,
      stats,
      progress,
      // Provide completed lesson ids (if available). The client will use this
      // to avoid issuing many per-lesson requests.
      completedLessonIds
    });

  } catch (error) {
    console.error('Error fetching course:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
