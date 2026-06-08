# RobEn Learning Hub — Full Performance & Efficiency Audit

> **Date:** June 6, 2026
> **Scope:** All API routes, client services, hooks, components, git changes, and database schema
> **Focus:** Server exhaustion under high traffic, client-side logic that belongs in the DB, and inefficient request patterns

---

## 🧭 Context for New Session

> **This section is for starting a new Claude Code session to work on these fixes. Read this first — it has everything needed to pick up without re-scanning the codebase.**

### Project Quick Reference

- **Repo:** `RobEn-AAST/roben-learning-hub` (GitHub), working directory `~/Desktop/RobEn/Learning-Hub`
- **Tech Stack:** Next.js 15 (App Router) + React 19 + TypeScript + Supabase + Tailwind + shadcn/ui + TanStack React Query + Three.js
- **Branch:** `main`, git user: `Mesbah`
- **How to run:** `npm run dev` → `http://localhost:3000`
- **Environment:** Supabase (PostgreSQL), deployed on RobEn's own server. Push to `main` = goes live.

### Architecture Map

```
src/
├── app/
│   ├── api/                          # API routes (76 files)
│   │   ├── admin/                    # Admin-only (uses service role key, bypasses RLS)
│   │   │   ├── analytics/            # 2 files — dashboard metrics
│   │   │   ├── courses/              # CRUD + stats + [id] sub-routes
│   │   │   ├── lessons/              # CRUD + stats + [id] sub-routes
│   │   │   ├── modules/              # CRUD + stats + [id] sub-routes
│   │   │   ├── quizzes/              # CRUD + stats + [id] + batch-save
│   │   │   ├── quiz-questions/       # CRUD + stats + [id] sub-routes
│   │   │   ├── question-options/     # CRUD + [id] sub-routes
│   │   │   ├── videos/               # CRUD + [id] + questions sub-routes
│   │   │   ├── users/                # List + stats
│   │   │   ├── course-instructors/   # Assignment CRUD
│   │   │   ├── enrolls/              # Enrollment management
│   │   │   ├── activity-logs/        # Log retrieval
│   │   │   ├── lesson-progress/      # Progress stats
│   │   │   └── enrolls/stats/        # Enrollment stats
│   │   ├── auth/callback/roben-sso/  # SSO login callback
│   │   ├── courses/[courseId]/       # Student course detail + progress + enroll
│   │   ├── courses/public/           # Public course listing
│   │   ├── dashboard/               # Student recommendations
│   │   ├── landing/                  # Landing page data
│   │   ├── lessons/[lessonId]/       # Lesson progress (complete/mark)
│   │   ├── instructor/               # Instructor dashboard + students
│   │   ├── project-submissions/      # Student + instructor submission queries
│   │   ├── submissions/[id]/         # Submission CRUD + approval
│   │   └── quizzes/[id]/attempt/     # Quiz attempt submission
│   ├── admin/courses/[courseId]/builder/  # Admin course builder page
│   ├── instructor/courses/[courseId]/builder/  # Instructor course builder page
│   └── courses/[courseId]/learn/     # Student learn page (polls every 30s)
├── services/                         # Data fetching service layer
│   ├── coursesService.ts             # Course CRUD + list + stats
│   ├── lessonService.ts              # Lesson CRUD + list + stats (⚠️ N+1 issues)
│   ├── moduleService.ts              # Module CRUD + reorder
│   ├── videoService.ts               # Video CRUD + stats + search
│   ├── quizService.ts                # Quiz CRUD + submit + score (⚠️ JS scoring)
│   ├── articleService.ts             # Article CRUD + list (⚠️ manual joins)
│   ├── projectService.ts             # Project CRUD + stats
│   ├── userService.ts                # User list + stats (⚠️ fetches all users)
│   ├── courseInstructorService.ts    # Instructor assignment CRUD
│   ├── courseInstructorServerActions.ts  # Server actions (⚠️ N+1 profiles)
│   ├── analyticsService.ts           # Analytics aggregation
│   ├── userServerActions.ts          # Server-side user actions
│   └── supabaseServerActions.ts      # Server-side Supabase actions
├── components/
│   ├── admin/
│   │   ├── CourseBuilder.tsx          # Main builder (1679 lines, ⚠️ heavy)
│   │   ├── QuizEditor.tsx            # Quiz editing (1087 lines, ⚠️ N+1 options)
│   │   ├── ArticleEditor.tsx         # Article editing (⚠️ 8 useEffects)
│   │   ├── VideoEditor.tsx           # Video editing
│   │   ├── ProjectEditor.tsx         # Project editing
│   │   ├── CourseInfoEditor.tsx      # Course settings (758 lines)
│   │   ├── CoursesListClient.tsx     # Course list grid
│   │   ├── CourseViewClient.tsx      # Single course view
│   │   ├── AdminDashboard.tsx        # Admin home
│   │   ├── AdminSidebar.tsx          # Admin nav
│   │   └── AdminMobileNav.tsx        # Admin mobile nav
│   ├── instructor/
│   │   ├── InstructorHomeClient.tsx  # Instructor dashboard
│   │   ├── InstructorSidebar.tsx     # Instructor nav
│   │   └── InstructorMobileNav.tsx   # Instructor mobile nav
│   └── 3d-elements.tsx               # Three.js background (⚠️ 36MB import)
├── hooks/
│   ├── useQueryCache.ts              # 60+ React Query hooks (1557 lines)
│   ├── useCourseLearn.ts             # Learn page hooks
│   ├── useVideos.ts                  # Video hooks (⚠️ duplicate keys)
│   └── useAuth.ts                    # Auth hook
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser Supabase client
│   │   └── server.ts                 # Server Supabase client + admin client
│   └── adminHelpers.ts               # Shared admin utilities
├── types/                            # TypeScript type definitions
└── supabase/migrations/              # DB schema (20+ migrations)
    └── 20251022100000_schema_only.sql  # Main schema (2900+ lines)
```

### Database Schema (Key Tables & Relationships)

```
courses
├── modules (FK: course_id, ORDER BY position)
│   └── lessons (FK: module_id, ORDER BY position)
│       ├── articles (FK: lesson_id, 1:1)
│       ├── videos (FK: lesson_id, 1:1)
│       │   └── video_questions (FK: video_id) [ON DELETE CASCADE exists]
│       ├── quizzes (FK: lesson_id, 1:1)
│       │   └── questions (FK: quiz_id)
│       │       └── question_options (FK: question_id)
│       └── projects (FK: lesson_id, 1:1)
│           └── project_submissions (FK: project_id, user_id)
├── course_enrollments (FK: course_id, user_id)
├── course_instructors (FK: course_id, instructor_id)
└── lesson_progress (FK: lesson_id, user_id)

profiles (FK: auth.users.id)
activity_logs (user_id, action, created_at)
quiz_attempts (FK: quiz_id, user_id)
user_answers (FK: attempt_id, question_id, selected_option_id)
```

### Existing RPC Functions (Already in the Database)

These already exist — check before creating new ones:
- `calculate_quiz_score` — quiz score computation
- `get_course_progress` — course progress for a user
- `get_courses_with_stats` — public course listing with enrollment counts
- `get_instructor_courses` — instructor's course list
- `is_admin()`, `is_instructor()`, `is_student()`, `is_instructor_of_course()` — role check functions used in RLS
- `handle_new_user` — trigger for new user profile creation
- Various stats functions per table

### Key Patterns to Know

1. **Admin API routes** use `supabaseAdmin` (service role key) — bypasses RLS entirely
2. **Client-side services** use `supabaseClient` (anon key) — subject to RLS
3. **Auth pattern in API routes:** `supabase.auth.getUser()` → `profiles.select('role')` → role check
4. **React Query config:** 5min staleTime, 30min GC time, exponential backoff retries
5. **Course Builder** (`CourseBuilder.tsx`) is the main admin/instructor interface — 1679 lines, manages modules + lessons + content editors
6. **Student learn page** polls every 30s with `cache: 'no-store'` + `_nocache=1` param
7. **Cache pattern:** In-memory `Map<string, {data, expiresAt}>` with 60s TTL in course detail route

### 📍 Current State (for next session)

> **Read this first to know exactly where we are.**

**What's been done (uncommitted, ready to push):**
- Phase 1: bug fixes, security fix, console.log cleanup, cache fix, polling fix ✅
- Phase 2: dynamic imports (Three.js + content editors) ✅
- Phase 3: `get_course_detail` RPC + `get_landing_data` RPC + Promise.all() fixes ✅
- Instructor assignment in Course Builder ✅
- Submissions review pages (admin + instructor) with per-course grouping ✅
- Instructor role access to all course-building APIs ✅
- Instructor view shows all courses for admin, assigned only for instructors ✅
- Course info is view-only for instructors ✅
- DB migrations applied to production: `019_rpc_get_course_detail.sql`, `021_unique_constraints_and_drop_indexes.sql`, `020_rpc_get_landing_data.sql`
- Server env reference saved in `docs/server-env-reference.md`

**What's blocking the push:**
- User wants to review and push — all dashboard changes are done
- Push to `main` → Vercel auto-deploys

**What to do after push (next session priorities):**
1. `Promise.all()` on remaining endpoints — issues #36, #26
2. More RPCs: analytics, lesson completion, reorder — issues #16, #13, #11
3. Fix N+1 instructor profiles — issue #20
4. Fix N+1 module lesson counts — issue #34
5. Fix client-side manual joins in articleService — issue #21
6. Add `useMemo`/`useCallback` where needed — issues #38-40
7. Replace `<img>` with `next/image` — issue #29
8. Full performance scan of entire project for the minimal server

**Files changed this session (uncommitted):**
- `src/app/page.tsx` + `src/components/three-d-background-wrapper.tsx` — dynamic import Three.js
- `src/components/admin/CourseBuilder.tsx` — dynamic editors, inline CourseInfoEditor with instructor assignment
- `src/app/api/landing/route.ts` — rewritten to use `get_landing_data` RPC + 30s cache
- `src/services/submissionService.ts` — added course data to submission queries
- `src/components/admin/ProjectSubmissionsAdminDashboard.tsx` — per-course grouping with badges
- `src/app/admin/submissions/page.tsx` + `src/app/instructor/submissions/page.tsx` — new pages
- `src/components/admin/AdminSidebar.tsx` + `AdminMobileNav.tsx` — Submissions nav item
- `src/components/instructor/InstructorSidebar.tsx` + `InstructorMobileNav.tsx` — Submissions nav item
- `src/services/courseInstructorService.ts` — Promise.all() on getUnassignedInstructors
- `src/services/projectService.ts` — Promise.all() on getProjectStats
- `src/services/courseInstructorServerActions.ts` — allow instructor role
- `src/components/admin/CourseInfoEditor.tsx` — instructorsLoading fix on error
- 23 admin API routes — allow instructor role for course-building operations
- `src/app/instructor/page.tsx` — admins see all courses, instructors see assigned only
- `src/app/api/courses/[courseId]/route.ts` — rewritten to use RPC (previous session)
- `src/app/api/courses/[courseId]/progress/route.ts` — fixed self-ref var + params type (previous session)
- `src/app/api/admin/videos/[id]/route.ts` — field whitelist + instructor role (previous session)
- `src/app/courses/[courseId]/learn/page.tsx` — stale closure fix + console.log removal (previous session)
- `supabase/migrations/019_rpc_get_course_detail.sql` — RPC function (previous session)
- `supabase/migrations/021_unique_constraints_and_drop_indexes.sql` — unique constraints (previous session)
- `supabase/migrations/020_rpc_get_landing_data.sql` — landing page RPC (new)
- All 22 migration files renamed to sequential numbering (001-022)
- ~30+ files — console.log removed from all API routes and services (previous session)
- `docs/server-env-reference.md` — server env reference
- `CLAUDE.md` — updated with all changes
- `roben-learning-hub-audit-report.md` — this file, updated with progress

**Server access:** `darn@robenclub` — Supabase at `https://supabase.roben.club`

### Recommended Implementation Order

> ⚠️ **SERVER CONSTRAINTS: 1 CPU core, 965MB RAM, 25GB disk.**
> This is the SECOND site on this server. Every optimization is survival-critical.

**Phase 1 — ✅ COMPLETED (June 8, 2026)**
1. ✅ Fix `const courseId = courseId` — deleted (issue #1)
2. ✅ Add field whitelist to video PUT (issue #2)
3. ✅ Fix stale closure in polling useEffect (issue #15)
4. ✅ Stop cache eviction on `_nocache` — skip read only (issue #7)
5. ✅ Add unique constraints for `lesson_progress` + `course_enrollments` (issue #23)
6. ✅ Drop redundant indexes (issue #24)
7. ✅ Remove `console.log` statements from production code (~326 removed) (issue #37)
8. ✅ Replace course detail with `get_course_detail` RPC (issue #6) — **biggest win**

**Phase 2 — ✅ COMPLETED (June 8, 2026)**
9. ✅ Dynamic import Three.js background (issue #27) — client wrapper component
10. ✅ Dynamic import content editors in CourseBuilder (issue #28) — 4 editors, lazy loaded

**Phase 3 — ✅ PARTIALLY COMPLETED (June 8, 2026)**
11. ✅ Replace landing page with `get_landing_data` RPC + 30s cache (issue #12)
12. ✅ `Promise.all()` on `getUnassignedInstructors` (issue #53)
13. ✅ `Promise.all()` on `projectService.getProjectStats` (issue #54)

**Phase 3 — REMAINING: Parallelize & RPC (~1-2 hours)**
14. `Promise.all()` on remaining: instructor dashboard (issue #36), submission approval (issue #26)
15. Fix N+1 instructor profiles in `courseInstructorServerActions.ts` (issue #20)
16. Fix N+1 module lesson counts in `modules/route.ts` (issue #34)
17. Fix client-side manual joins in `articleService.ts` (issue #21)

**Phase 4 — Create More RPC Functions (~2-3 hours)**
18. Replace analytics 12-query with `get_platform_analytics_summary` RPC (issue #16)
19. Replace lesson stats with single `COUNT FILTER` query or RPC (issue #17)
20. Replace lesson completion with `complete_lesson` RPC (issue #13)
21. Replace reorder with `reorder_items` RPC (issue #11)
22. Replace `lessonService.getLessons()` N+1 with RPC (issue #3)

**Phase 5 — Component Optimization (~1-2 hours)**
23. Add `useMemo`/`useCallback` where needed (issues #38-40)
24. Replace `<img>` with `next/image` (issue #29)
25. Remove dead `LessonEditor` code (issue #42)

**Phase 6 — Cleanup & Hardening (ongoing)**
26. Fix SSO `listUsers()` to query profiles by email (issue #5)
27. Add pagination to admin GET endpoints (issue #22)
28. Centralize `createAdminClient` (issue #31)
29. Fix slug uniqueness race condition (issue #32)
30. Add LRU cache bound — **critical for 965MB RAM server** (issue #8)
31. RLS policy optimization (issue #10)

**Feature Work Done (June 8, 2026)**
- ✅ Instructor assignment in Course Builder (inline CourseInfoEditor with auto-save)
- ✅ Submissions review pages: `/admin/submissions` + `/instructor/submissions`
- ✅ Per-course grouping in submission dashboard with pending count badges
- ✅ Instructor role access to all 23 course-building admin APIs
- ✅ Admin sees all courses in Instructor View; instructors see assigned only
- ✅ Course info view-only for instructors (title, description, cover, status, instructors)
- ✅ All 22 migrations renamed to sequential numbering (001-022)

### Files That Will Change Per Phase

| Phase | Files Touched |
|-------|---------------|
| **Phase 1** | `progress/route.ts`, `videos/[id]/route.ts`, `learn/page.tsx`, `courses/[courseId]/route.ts`, new migration file, ~10 service/route files for console.log cleanup |
| **Phase 2** | `landing/route.ts`, `instructor/dashboard/route.ts`, `submissions/[id]/route.ts`, `courseInstructorServerActions.ts`, `modules/route.ts`, `articleService.ts`, `courses/[courseId]/route.ts`, `courseInstructorService.ts`, `projectService.ts` |
| **Phase 3** | New migration file + `lessonService.ts`, `quizService.ts`, `analytics/route.ts`, `lessons/stats/route.ts`, `courses/[courseId]/route.ts`, `lessons/[lessonId]/progress/route.ts`, `lessonService.ts`, `moduleService.ts` |
| **Phase 4** | `page.tsx` (homepage), `CourseBuilder.tsx`, `QuizEditor.tsx`, `CoursesListClient.tsx`, `AdminDashboard.tsx`, `CourseInfoEditor.tsx`, `CourseViewClient.tsx`, `InstructorHomeClient.tsx`, `next.config.js` |
| **Phase 5** | `roben-sso/route.ts`, 7+ admin GET routes, `adminHelpers.ts`, `server.ts`, `courses/route.ts`, `courses/[courseId]/route.ts`, RLS migration |

### Current Git State (Uncommitted Changes)

The following changes are sitting uncommitted on `main` and are included in this audit:

- **Modified:** Admin/instructor layouts + pages, all admin API routes, services (courses, videos), learn page, submission route, CourseBuilder, AdminDashboard
- **Deleted:** Old table management pages (settings, quiz-questions, question-options, tables, progress-debug), ProjectSubmissionForm, instructor tables page
- **Added:** New admin course builder routes, sidebar/mobile nav components, CourseBuilder + all editors, instructor components, batch-save API, docs folder

> ⚠️ **Pushing to `main` goes directly to the production server.** Fix issues #1 and #2 at minimum before pushing.

---

## Table of Contents

- [🧭 Context for New Session](#-context-for-new-session)
- [🔴 CRITICAL — Fix Before Pushing](#-critical--fix-before-pushing)
- [🟠 HIGH — Will Break Under Load](#-high--will-break-under-load)
- [🟡 MEDIUM — Inefficient but Not Breaking](#-medium--inefficient-but-not-breaking)
- [🔵 LOW — Minor / Code Quality](#-low--minor--code-quality)
- [📊 Top 5 Highest-Impact Fixes](#-top-5-highest-impact-fixes)
- [📋 Recommended RPC Functions to Create](#-recommended-rpc-functions-to-create)
- [📋 Recommended Database Changes](#-recommended-database-changes)

---

## 🔴 CRITICAL — Fix Before Pushing

### 1. Self-referencing variable breaks the progress endpoint
**File:** `src/app/api/courses/[courseId]/progress/route.ts:14`

```typescript
const courseId = courseId; // SyntaxError: Cannot access before initialization
```

The variable is already destructured on line 7. This will crash at runtime.

**Fix:** Delete line 14.

---

### 2. Mass assignment vulnerability in video PUT
**File:** `src/app/api/admin/videos/[id]/route.ts:73-78`

```typescript
const videoData = await request.json();
.update({ ...videoData, updated_at: ... })  // any column can be overwritten
```

A malicious admin could overwrite `id`, `lesson_id`, `created_at`, etc.

**Fix:** Whitelist allowed fields before updating:

```typescript
const body = await request.json();
const allowedFields = ['url', 'title', 'description', 'duration_seconds', 'provider', 'provider_video_id', 'transcript'];
const videoData: Record<string, any> = { updated_at: new Date().toISOString() };
for (const key of allowedFields) {
  if (body[key] !== undefined) videoData[key] = body[key];
}
```

---

### 3. N+1 query in lesson content counts — 40+ requests per page
**File:** `src/services/lessonService.ts:291-302`

For every lesson, fires 4 separate count queries (videos, articles, projects, quizzes). With 10 lessons = **40 HTTP round trips**.

**Impact:** 100 admins × 40 requests = 4,000 concurrent Supabase calls.

**Fix:** Create RPC `get_lessons_with_content_counts()` that does `LEFT JOIN` + `COUNT` aggregation in a single query:

```sql
CREATE OR REPLACE FUNCTION get_lessons_with_content_counts(
  p_limit int DEFAULT 10,
  p_offset int DEFAULT 0,
  p_module_id uuid DEFAULT NULL,
  p_course_id uuid DEFAULT NULL,
  p_lesson_type text DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS TABLE (
  id uuid, title text, lesson_type text, position int,
  status text, instructor_id uuid, module_id uuid,
  created_at timestamptz, updated_at timestamptz,
  module_title text, course_id uuid, course_title text,
  instructor_first_name text, instructor_last_name text,
  videos_count bigint, articles_count bigint,
  projects_count bigint, quizzes_count bigint,
  total_count bigint
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_total bigint;
BEGIN
  SELECT COUNT(*) INTO v_total FROM lessons l
    JOIN modules m ON m.id = l.module_id
    JOIN courses c ON c.id = m.course_id
    WHERE (p_module_id IS NULL OR l.module_id = p_module_id)
      AND (p_course_id IS NULL OR m.course_id = p_course_id)
      AND (p_lesson_type IS NULL OR l.lesson_type::text = p_lesson_type)
      AND (p_status IS NULL OR l.status::text = p_status);

  RETURN QUERY
  SELECT
    l.id, l.title, l.lesson_type, l.position, l.status, l.instructor_id,
    l.module_id, l.created_at, l.updated_at,
    m.title, c.id, c.title,
    p.first_name, p.last_name,
    COALESCE(v.cnt, 0), COALESCE(a.cnt, 0),
    COALESCE(pr.cnt, 0), COALESCE(q.cnt, 0),
    v_total
  FROM lessons l
  JOIN modules m ON m.id = l.module_id
  JOIN courses c ON c.id = m.course_id
  LEFT JOIN profiles p ON p.id = l.instructor_id
  LEFT JOIN (SELECT lesson_id, COUNT(*) cnt FROM videos GROUP BY lesson_id) v ON v.lesson_id = l.id
  LEFT JOIN (SELECT lesson_id, COUNT(*) cnt FROM articles GROUP BY lesson_id) a ON a.lesson_id = l.id
  LEFT JOIN (SELECT lesson_id, COUNT(*) cnt FROM projects GROUP BY lesson_id) pr ON pr.lesson_id = l.id
  LEFT JOIN (SELECT lesson_id, COUNT(*) cnt FROM quizzes GROUP BY lesson_id) q ON q.lesson_id = l.id
  WHERE (p_module_id IS NULL OR l.module_id = p_module_id)
    AND (p_course_id IS NULL OR m.course_id = p_course_id)
    AND (p_lesson_type IS NULL OR l.lesson_type::text = p_lesson_type)
    AND (p_status IS NULL OR l.status::text = p_status)
  ORDER BY l.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
```

---

### 4. Quiz scoring done in JavaScript instead of Postgres
**File:** `src/services/quizService.ts:229-279`

4-5 round trips per quiz submission: fetch quiz+questions+options, compute score in JS, fetch previous attempts, insert. Also has a race condition on attempt numbers.

**Impact:** 100 students submitting simultaneously = 400-500 API calls in a burst.

**Fix:** Create RPC `submit_quiz_and_score()`:

```sql
CREATE OR REPLACE FUNCTION submit_quiz_and_score(
  p_quiz_id uuid,
  p_answers jsonb, -- {"question_id": "selected_option_id", ...}
  p_time_taken_seconds int DEFAULT NULL
)
RETURNS TABLE (attempt_id uuid, score numeric, total_questions int,
               percentage numeric, passed boolean, attempt_number int)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_next_attempt int;
  v_earned int := 0;
  v_total int := 0;
  v_pct numeric;
  v_passed boolean;
  v_passing_score int;
  v_attempt_id uuid;
  v_question_id uuid;
  v_selected uuid;
  v_correct uuid;
  v_points int;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT passing_score INTO v_passing_score FROM quizzes WHERE id = p_quiz_id;

  SELECT COALESCE(MAX(attempt_number), 0) + 1 INTO v_next_attempt
    FROM quiz_attempts WHERE quiz_id = p_quiz_id AND user_id = v_user_id;

  FOR v_question_id, v_selected IN
    SELECT key::uuid, value::uuid FROM jsonb_each_text(p_answers)
  LOOP
    SELECT points INTO v_points FROM questions WHERE id = v_question_id;
    SELECT id INTO v_correct FROM question_options
      WHERE question_id = v_question_id AND is_correct = true LIMIT 1;
    v_total := v_total + COALESCE(v_points, 1);
    IF v_selected = v_correct THEN v_earned := v_earned + COALESCE(v_points, 1); END IF;
  END LOOP;

  v_pct := CASE WHEN v_total > 0 THEN ROUND((v_earned::numeric / v_total::numeric) * 100, 2) ELSE 0 END;
  v_passed := (v_pct >= COALESCE(v_passing_score, 70));

  INSERT INTO quiz_attempts (quiz_id, user_id, score, total_questions, percentage,
    passed, attempt_number, answers, time_taken_seconds, completed_at)
  VALUES (p_quiz_id, v_user_id, v_pct,
    (SELECT COUNT(*)::int FROM questions WHERE quiz_id = p_quiz_id),
    v_pct, v_passed, v_next_attempt, p_answers, p_time_taken_seconds, now())
  RETURNING id INTO v_attempt_id;

  RETURN QUERY SELECT v_attempt_id, v_pct,
    (SELECT COUNT(*)::int FROM questions WHERE quiz_id = p_quiz_id),
    v_pct, v_passed, v_next_attempt;
END;
$$;
```

---

### 5. SSO callback uses `listUsers()` — fetches ALL auth users
**File:** `src/app/api/auth/callback/roben-sso/route.ts:47-49`

Calls `adminClient.auth.admin.listUsers()` to find one user by email. Returns all users. **Supabase paginates at 1000 users** — this will silently fail to find users beyond page 1 once you grow.

**Fix:** Query `profiles` table by email directly, or use a filtered query instead of listing all users.

---

## 🟠 HIGH — Will Break Under Load

### 6. Student course detail: 6-8 sequential queries per page load
**File:** `src/app/api/courses/[courseId]/route.ts:150-370`

This is the most frequently hit student endpoint. Every 30-second poll triggers: course select → modules+lessons → quizzes → instructor lookup → enrollment count → enrollment check → lesson progress. **6-8 sequential round trips.**

**Fix:** Create RPC `get_course_detail(course_id, user_id)` that returns everything in one call.

---

### 7. 30-second polling defeats the cache entirely
**Files:** `src/app/courses/[courseId]/learn/page.tsx:141-152` and `src/app/api/courses/[courseId]/route.ts:147-155`

Every student polls every 30s with `_nocache=1`, which deletes the cache entry. With N students, the cache is always empty. Every poll = full DB query chain (issue #6).

**Fix:** Don't delete cache on `_nocache` — just skip cache read for that request. Let the 60s TTL handle refresh naturally. Or use Supabase Realtime subscriptions for curriculum changes.

---

### 8. Unbounded in-memory Map cache — memory leak
**File:** `src/app/api/courses/[courseId]/route.ts:31,35`

`publicCourseCache` and `completedLessonsCache` are `Map` objects with no max size and no cleanup. Expired entries are never removed. Memory grows indefinitely.

**Fix:** Add periodic cleanup or use an LRU cache with a max size.

---

### 9. Fetches ALL progress rows to compute average
**File:** `src/app/api/admin/lesson-progress/stats/route.ts:59-67`

```typescript
const { data: avgData } = await supabase.from('lesson_progress').select('progress');
const total = avgData.reduce((sum, item) => sum + Number(item.progress), 0);
```

Transfers the **entire** `lesson_progress` table to Node.js just to compute an average.

**Fix:** SQL `SELECT AVG(progress) FROM lesson_progress` — or an RPC.

---

### 10. RLS policies use nested function calls per row — O(rows × subqueries)
**File:** `supabase/migrations/20251022100000_schema_only.sql:2556-2907`

Policies call `is_admin()`, `is_instructor_of_course()`, etc. — each is an `EXISTS` subquery. For a table with 100 rows, evaluating a policy with 4 OR branches means **200-400 subquery evaluations per request**.

**Fix:** Replace function-based policies with direct JOIN-based policies the Postgres planner can optimize. Inline the `is_admin()` check instead of calling a function per row.

---

### 11. Sequential reorder: N updates for N items
**Files:** `src/services/lessonService.ts:565-585`, `src/services/moduleService.ts:297-317`

Reordering 10 lessons = 10 sequential HTTP calls in a `for...of` loop. Each waits for the previous one.

**Fix:** Create RPC `reorder_items(table, ids[], positions[])`:

```sql
CREATE OR REPLACE FUNCTION reorder_items(
  p_table text,
  p_ids uuid[],
  p_positions int[]
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET position = vals.pos, updated_at = now()
     FROM unnest($1::uuid[], $2::int[]) AS vals(id, pos)
     WHERE %I.id = vals.id',
    p_table, p_table
  )
  USING p_ids, p_positions;
END;
$$;
```

---

### 12. Landing page: 6-7 sequential queries
**File:** `src/app/api/landing/route.ts:28-117`

Every visitor (even unauthenticated) triggers 6-7 sequential DB queries. None are parallelized.

**Fix:** Wrap independent queries in `Promise.all()`, or create RPC `get_landing_data()`.

---

### 13. Lesson completion: up to 8 sequential queries
**File:** `src/app/api/lessons/[lessonId]/progress/route.ts:27-198`

Every "mark lesson complete" triggers: lesson lookup → progress check → module lookup → enrollment check → previous lessons → previous progress → previous modules → previous module progress.

**Fix:** Create RPC `complete_lesson(user_id, lesson_id)` — atomic operation.

---

### 14. QuizEditor loads options one-question-at-a-time (client-side N+1)
**File:** `src/components/admin/QuizEditor.tsx:219-243`

Fires one network request per question to load options. 20 questions = 20 round trips. The server-side builder page already fetches this correctly with joins.

**Fix:** Read from the pre-fetched `lesson.content.quiz.questions` data instead of re-fetching, or batch-fetch options with `.in('question_id', questionIds)`.

---

### 15. Polling useEffect has stale closure
**File:** `src/app/courses/[courseId]/learn/page.tsx:143-152`

The polling `useEffect` captures `fetchCourseData` at mount time. The interval callback holds a stale reference — polled fetches operate with outdated state.

**Fix:** Use a ref for the fetch function:

```typescript
const fetchRef = useRef(fetchCourseData);
fetchRef.current = fetchCourseData;

useEffect(() => {
  if (!courseId) return;
  const id = setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    fetchRef.current(true);
  }, 30_000);
  return () => clearInterval(id);
}, [courseId]);
```

---

## 🟡 MEDIUM — Inefficient but Not Breaking

### 16. Analytics: 12 parallel count queries should be 1 RPC
**File:** `src/app/api/admin/analytics/route.ts:13-92`

12 separate `SELECT count` via `Promise.all` = 12 connection slots per admin dashboard load.

**Fix:** Single RPC with subqueries:

```sql
CREATE OR REPLACE FUNCTION get_platform_analytics_summary()
RETURNS TABLE (
  total_users bigint, new_users_this_month bigint,
  total_courses bigint, published_courses bigint,
  total_enrollments bigint, new_enrollments_this_month bigint,
  total_lessons bigint, total_modules bigint,
  total_quizzes bigint, total_videos bigint,
  completed_progress bigint, today_active_users bigint
)
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
DECLARE
  v_month_start timestamptz := date_trunc('month', now());
  v_today_start date := current_date;
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM profiles),
    (SELECT COUNT(*) FROM profiles WHERE created_at >= v_month_start),
    (SELECT COUNT(*) FROM courses),
    (SELECT COUNT(*) FROM courses WHERE status = 'published'),
    (SELECT COUNT(*) FROM course_enrollments),
    (SELECT COUNT(*) FROM course_enrollments WHERE enrolled_at >= v_month_start),
    (SELECT COUNT(*) FROM lessons),
    (SELECT COUNT(*) FROM modules),
    (SELECT COUNT(*) FROM quizzes),
    (SELECT COUNT(*) FROM lessons WHERE lesson_type = 'video'),
    (SELECT COUNT(*) FROM lesson_progress WHERE status = 'completed'),
    (SELECT COUNT(DISTINCT user_id) FROM activity_logs WHERE created_at >= v_today_start);
END;
$$;
```

---

### 17. Lesson stats: 7 parallel count queries should be 1 query
**Files:** `src/services/lessonService.ts:326-355`, `src/app/api/admin/lessons/stats/route.ts:27-45`

**Fix:** Single query with conditional aggregation:

```sql
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'visible') as visible,
  COUNT(*) FILTER (WHERE status = 'hidden') as hidden,
  COUNT(*) FILTER (WHERE lesson_type = 'video') as video,
  COUNT(*) FILTER (WHERE lesson_type = 'article') as article,
  COUNT(*) FILTER (WHERE lesson_type = 'project') as project,
  COUNT(*) FILTER (WHERE lesson_type = 'quiz') as quiz
FROM lessons;
```

---

### 18. Course stats fetches ALL courses to count statuses
**File:** `src/app/api/admin/courses/stats/route.ts:19-44`

`SELECT status FROM courses` then `.forEach()` to count. Should be `GROUP BY status`.

---

### 19. User stats fetches ALL users just to count by role
**File:** `src/services/userService.ts:364-413`

Calls `getAllUsers()` (all auth users + all profiles) then `.filter()` to count. Should be targeted `COUNT` queries or an RPC:

```sql
CREATE OR REPLACE FUNCTION get_user_stats()
RETURNS TABLE (total_users bigint, admin_users bigint, student_users bigint,
  recently_active bigint, email_confirmed bigint, unconfirmed bigint)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM profiles),
    (SELECT COUNT(*) FROM profiles WHERE role = 'admin'),
    (SELECT COUNT(*) FROM profiles WHERE role = 'student'),
    (SELECT COUNT(*) FROM auth.users WHERE last_sign_in_at > now() - interval '7 days'),
    (SELECT COUNT(*) FROM auth.users WHERE email_confirmed_at IS NOT NULL),
    (SELECT COUNT(*) FROM auth.users WHERE email_confirmed_at IS NULL);
END;
$$;
```

---

### 20. N+1 instructor profile fetches
**File:** `src/services/courseInstructorServerActions.ts:188-205`

Loops through each instructor assignment and fetches profile individually.

**Fix:** Single `SELECT ... FROM profiles WHERE id IN (...)`.

---

### 21. Client-side manual joins (4 sequential fetches)
**File:** `src/services/articleService.ts:114-177`

Fetches articles → lessons → modules → courses in 4 round trips. Meanwhile `getArticleById()` already uses proper Supabase nested joins in 1 query.

---

### 22. Missing pagination on 7+ admin GET endpoints

| Endpoint | File |
|----------|------|
| Users GET | `src/app/api/admin/users/route.ts` |
| Question options GET | `src/app/api/admin/question-options/route.ts` |
| Quiz questions GET | `src/app/api/admin/quiz-questions/route.ts` |
| Quizzes GET | `src/app/api/admin/quizzes/route.ts` |
| Videos GET | `src/app/api/admin/videos/route.ts` |
| Course instructors GET | `src/app/api/admin/course-instructors/route.ts` |
| Project submissions GET | `src/app/api/project-submissions/route.ts` |

All return unlimited rows. Will degrade as data grows.

---

### 23. Missing unique constraints on critical tables

- `lesson_progress(user_id, lesson_id)` — allows duplicate progress records
- `course_enrollments(user_id, course_id)` — allows duplicate enrollments

Race conditions from double-clicks or concurrent tabs can corrupt progress.

**Fix:**

```sql
CREATE UNIQUE INDEX IF NOT EXISTS lesson_progress_user_lesson_unique
  ON lesson_progress (user_id, lesson_id);

CREATE UNIQUE INDEX IF NOT EXISTS course_enrollments_user_course_unique
  ON course_enrollments (user_id, course_id);
```

---

### 24. Redundant duplicate indexes
**File:** `supabase/migrations/20251022100000_schema_only.sql`

5 pairs of identical indexes waste disk space and slow writes:

| Table | Duplicate Indexes |
|-------|-------------------|
| `activity_logs` | 3 identical `created_at DESC` indexes |
| `videos` | 2 identical `lesson_id` indexes |
| `question_options` | 2 identical `question_id` indexes |
| `course_enrollments` | 2 identical `(user_id, course_id)` indexes |

**Fix:**

```sql
DROP INDEX IF EXISTS idx_activity_logs_created_at_desc;
DROP INDEX IF EXISTS test_activity_logs_created;
DROP INDEX IF EXISTS idx_videos_lesson;
DROP INDEX IF EXISTS idx_question_options_question_id_lookup;
DROP INDEX IF EXISTS idx_enrollments_user_course;
```

---

### 25. String interpolation in Supabase search query
**File:** `src/services/videoService.ts:191`

`.or(\`url.ilike.%${query}%...\`)` — unsanitized user input in PostgREST filter.

**Fix:** Sanitize the query by stripping special PostgREST characters, or use `.ilike()` with proper parameterization for each field separately.

---

### 26. Submission approval: 7 sequential queries + redundant lookups
**File:** `src/app/api/submissions/[id]/route.ts:90-254`

Same 4-query authorization check repeated across GET/PUT/DELETE methods. Fetches submission→project twice.

**Fix:** Extract to shared helper or create RPC `can_instructor_access_submission()`:

```sql
CREATE OR REPLACE FUNCTION can_instructor_access_submission(
  p_instructor_id uuid, p_submission_id uuid
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_submissions ps
    JOIN projects pr ON pr.id = ps.project_id
    JOIN lessons l ON l.id = pr.lesson_id
    JOIN modules m ON m.id = l.module_id
    JOIN course_instructors ci ON ci.course_id = m.course_id
      AND ci.instructor_id = p_instructor_id AND ci.is_active = true
    WHERE ps.id = p_submission_id
  );
END;
$$;
```

---

### 27. Three.js imported eagerly on homepage (~36 MB)
**File:** `src/app/page.tsx:5` → `src/components/3d-elements.tsx:6`

`import * as THREE from 'three'` ships the entire library to every visitor. On mobile it's hidden (`hidden md:block`) but still downloaded.

**Fix:**

```typescript
const ThreeDBackground = dynamic(
  () => import('@/components/3d-elements').then(m => ({ default: m.ThreeDBackground })),
  { ssr: false, loading: () => null }
);
```

---

### 28. 4 content editors imported eagerly in CourseBuilder
**File:** `src/components/admin/CourseBuilder.tsx:41-44`

Only 1 editor renders at a time but all 4 are in the bundle.

**Fix:** Dynamic imports:

```typescript
const ArticleEditor = dynamic(() => import('@/components/admin/ArticleEditor'));
const VideoEditor = dynamic(() => import('@/components/admin/VideoEditor').then(m => ({ default: m.VideoEditor })));
const QuizEditor = dynamic(() => import('@/components/admin/QuizEditor').then(m => ({ default: m.QuizEditor })));
const ProjectEditor = dynamic(() => import('@/components/admin/ProjectEditor').then(m => ({ default: m.ProjectEditor })));
```

---

### 29. 10 `<img>` tags instead of `next/image`

| Component | Line |
|-----------|------|
| CourseBuilder.tsx | 1503 |
| CourseViewClient.tsx | 125 |
| CoursesListClient.tsx | 245 |
| AdminDashboard.tsx | 252 |
| CourseInfoEditor.tsx | 567, 612 |
| InstructorHomeClient.tsx | 116 |

Cover images loaded without optimization, format conversion, or lazy loading. A 2 MB cover image is sent as-is instead of ~200 KB WebP.

**Fix:** Use `next/image` with proper `width`/`height` props and configure imgbb domains in `next.config.js`.

---

### 30. Duplicate query keys across hooks
**Files:** `src/hooks/useQueryCache.ts` vs `src/hooks/useVideos.ts`

`useVideos()` and `useVideoStats()` defined in both files with different query keys. Components importing from different files fetch the same data independently, doubling API calls.

**Fix:** Consolidate all hooks into a single authoritative source per domain.

---

### 31. Duplicate `createAdminClient` in 4 files

| File | Lines |
|------|-------|
| `src/lib/adminHelpers.ts` | 6-23 |
| `src/lib/supabase/server.ts` | 82-98 |
| `src/services/courseInstructorServerActions.ts` | 5-22 |
| `src/services/userServerActions.ts` | 4-22 |

Same function copy-pasted. Each request creates 2-3 Supabase client instances.

**Fix:** Centralize in `adminHelpers.ts` and import everywhere.

---

### 32. Slug uniqueness via while-loop with race condition
**File:** `src/app/api/admin/courses/route.ts:76-87`

Concurrent course creation with same name can pass the uniqueness check simultaneously.

**Fix:** Unique constraint on `slug` with `ON CONFLICT` handling, or generate slug with UUID suffix.

---

### 33. Course progress fetches ALL user progress across all courses
**File:** `src/app/api/courses/[courseId]/route.ts:344-356`

Fetches every `lesson_progress` record for a user then filters in JavaScript. A student with 200+ completed lessons across 10 courses has their entire history pulled for 1 course.

**Fix:** Filter at the database level: `.in('lesson_id', allLessonIds)` instead of fetching everything.

---

### 34. Modules N+1: one count query per module
**File:** `src/app/api/admin/modules/route.ts:78-89`

After fetching modules, loops and fires a separate `SELECT count` for each module's lessons.

**Fix:** Single query `SELECT module_id, COUNT(*) FROM lessons WHERE module_id IN (...) GROUP BY module_id`.

---

### 35. Supabase metrics: 10 sequential table count queries
**File:** `src/app/api/admin/analytics/supabase/route.ts:29-49`

Iterates over 10 table names with `for...of` (sequential, not parallel). Each is a separate round trip.

**Fix:** `Promise.all()` at minimum. Better: single Postgres function using `pg_class` system catalog.

---

### 36. Instructor-scoped endpoints: 5-7 sequential queries each
**Files:**
- `src/app/api/admin/lessons/stats/route.ts:88-104`
- `src/app/api/admin/quizzes/stats/route.ts:43-65`
- `src/app/api/admin/quiz-questions/stats/route.ts:42-77`
- `src/app/api/admin/quiz-questions/route.ts:43-77`
- `src/app/api/admin/quizzes/route.ts:41-66`

All follow the same pattern: `getAllowedInstructorCourseIds` → fetch lessons → fetch content → stats. 5-7 sequential round trips each.

**Fix:** Create RPC `get_instructor_scoped_stats(instructor_id)` that does the entire chain in Postgres.

---

## 🔵 LOW — Minor / Code Quality

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| 37 | Excessive `console.log` in production | All API routes + services | Remove or guard behind `NODE_ENV === 'development'` |
| 38 | Missing `useMemo` for filtered course lists | `CoursesListClient.tsx:94` | Wrap in `useMemo` |
| 39 | Missing `useCallback` for editor save handlers | `CourseBuilder.tsx:1280+` | Stabilize with `useCallback` keyed on lesson ID |
| 40 | `QuestionCard` not memoized | `QuizEditor.tsx:859` | Wrap in `React.memo` |
| 41 | Cascading useEffects in ArticleEditor (8 effects) | `ArticleEditor.tsx` | Consolidate into derived values |
| 42 | Dead `LessonEditor` component (133 lines) | `CourseBuilder.tsx:1537-1669` | Delete |
| 43 | Duplicate CourseInfoEditor (inline + standalone file) | `CourseBuilder.tsx` + `CourseInfoEditor.tsx` | Consolidate into one |
| 44 | No `prefers-reduced-motion` support | All 15 Framer Motion files | Add global config |
| 45 | `select('*')` on videos/profiles | Multiple API routes | Specify needed columns |
| 46 | Video delete does manual cascade (FK already handles it) | `videoService.ts:146` | Remove manual `video_questions` delete |
| 47 | Module-level Supabase client instantiation | Multiple services | Lazy initialization via getter |
| 48 | `layout` animation on course cards | `AdminDashboard.tsx`, `CoursesListClient.tsx` | Remove or use `layout="position"` |
| 49 | `rehype-highlight` includes all syntax grammars | `ArticleEditor.tsx:6` | Import only needed languages |
| 50 | Missing error boundaries around data-heavy components | `QueryProvider.tsx` | Add global `onError` handler |
| 51 | Fragile URL parsing for Supabase Studio link | `AdminDashboard.tsx:78-80` | Use `new URL()` parsing |
| 52 | Quiz creation allows null title | `api/admin/quizzes/route.ts:119-123` | Validate title is non-empty |
| 53 | `getUnassignedInstructors` — two sequential fetches | `courseInstructorService.ts:326-338` | Use `Promise.all()` |
| 54 | `projectService.getProjectStats()` — 4 sequential counts | `projectService.ts:195-236` | Wrap in `Promise.all()` |
| 55 | Deleted pages have no redirects | 6 deleted page files | Add `redirect()` stubs |

---

## 📊 Top 5 Highest-Impact Fixes

If you only fix 5 things before pushing, make it these:

| Priority | What | Round trips saved | Impact |
|----------|------|-------------------|--------|
| **P0** | Fix `const courseId = courseId` (issue #1) | N/A | **Build-breaking** |
| **P0** | Mass assignment whitelist (issue #2) | N/A | **Security** |
| **P0** | RPC `get_course_detail()` (issue #6) | 6-8 → 1 per student poll | **Every student, every 30s** |
| **P0** | RPC `submit_quiz_and_score()` (issue #4) | 4-5 → 1 per quiz | **100 students submitting** |
| **P0** | Stop cache eviction on `_nocache` (issue #7) | Eliminates wasted full queries | **All active students** |

---

## 📋 Recommended RPC Functions to Create

These would replace the most round-trip-heavy patterns in the codebase:

| RPC Name | Replaces | Current Queries | After |
|----------|----------|-----------------|-------|
| `get_course_detail(course_id, user_id)` | Student course page | 6-8 sequential | 1 |
| `submit_quiz_and_score(quiz_id, answers, time)` | Quiz submission | 4-5 sequential | 1 |
| `get_lessons_with_content_counts(filters)` | Admin lessons table | 40+ parallel | 1 |
| `get_platform_analytics_summary()` | Admin analytics | 12 parallel | 1 |
| `complete_lesson(user_id, lesson_id)` | Lesson completion | 8 sequential | 1 |
| `get_landing_data(user_id)` | Landing page | 6-7 sequential | 1 |
| `get_instructor_scoped_stats(instructor_id)` | All instructor stats endpoints | 5-7 per endpoint | 1 |
| `reorder_items(table, ids[], positions[])` | Lesson/module reorder | N sequential | 1 |
| `get_user_stats()` | User stats | Full table scan | 1 |
| `can_instructor_access_submission(instructor_id, submission_id)` | Submission auth check | 4 per method | 1 |
| `check_lesson_completeness(lesson_id)` | Visibility toggle | 1-3 per lesson | 1 |

---

## 📋 Recommended Database Changes

### Missing Indexes

```sql
-- Lesson progress lookups
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_status ON lesson_progress (user_id, status);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_user ON lesson_progress (lesson_id, user_id);

-- Enrollment lookups
CREATE INDEX IF NOT EXISTS idx_enrollments_course_user ON course_enrollments (course_id, user_id);

-- Activity log ordering
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at_desc ON activity_logs (created_at DESC);

-- Question/quiz lookups
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions (quiz_id);

-- Module/lesson ordering
CREATE INDEX IF NOT EXISTS idx_modules_course_position ON modules (course_id, position);
CREATE INDEX IF NOT EXISTS idx_lessons_module_position ON lessons (module_id, position);
```

### Missing Unique Constraints

```sql
CREATE UNIQUE INDEX IF NOT EXISTS lesson_progress_user_lesson_unique ON lesson_progress (user_id, lesson_id);
CREATE UNIQUE INDEX IF NOT EXISTS course_enrollments_user_course_unique ON course_enrollments (user_id, course_id);
```

### Redundant Indexes to Drop

```sql
DROP INDEX IF EXISTS idx_activity_logs_created_at_desc;
DROP INDEX IF EXISTS test_activity_logs_created;
DROP INDEX IF EXISTS idx_videos_lesson;
DROP INDEX IF EXISTS idx_question_options_question_id_lookup;
DROP INDEX IF EXISTS idx_enrollments_user_course;
```

---

## Summary Statistics

| Category | Count |
|----------|-------|
| **Critical issues** | 5 |
| **High issues** | 10 |
| **Medium issues** | 21 |
| **Low issues** | 19 |
| **Total issues** | 55 |
| **Recommended RPC functions** | 11 |
| **Missing indexes** | 7 |
| **Missing unique constraints** | 2 |
| **Redundant indexes to drop** | 5 |

The single highest-leverage action is creating the recommended RPC functions — together they would reduce the worst-case API call count from **50+ round trips per page load to under 5**, and eliminate the RLS subquery amplification that makes every query O(rows × subqueries).

---

## ✅ Fixes Applied (June 8, 2026)

### Phase 1 — Bug Fixes & Security (COMPLETED)
| # | Fix | Status | Details |
|---|-----|--------|---------|
| 1 | Self-referencing `const courseId = courseId` | ✅ Fixed | Deleted broken line in `progress/route.ts` |
| 2 | Mass assignment in video PUT | ✅ Fixed | Added field whitelist in `videos/[id]/route.ts` |
| 3 | Stale closure in polling useEffect | ✅ Fixed | Added `useRef` pattern in `learn/page.tsx` |
| 4 | Cache eviction on `_nocache` | ✅ Fixed | Skip read only, don't delete cache entry |
| 5 | Unique constraints | ✅ Applied to production | Migration `021_unique_constraints_and_drop_indexes.sql` |
| 6 | Redundant indexes dropped | ✅ Applied to production | Same migration as #5 |
| 7 | Console.log cleanup | ✅ Done | ~326 removed from 30+ files |

### Phase 2 — Dynamic Imports (COMPLETED)
| # | Fix | Status | Details |
|---|-----|--------|---------|
| 8 | Dynamic import Three.js | ✅ Fixed | Client wrapper component, ~36MB saved |
| 9 | Dynamic import content editors | ✅ Fixed | 4 editors lazy loaded in CourseBuilder |

### Phase 3 — RPCs & Parallelization (PARTIALLY COMPLETED)
| # | Fix | Status | Details |
|---|-----|--------|---------|
| 10 | `get_course_detail` RPC | ✅ Applied to production | Replaced 5-7 queries with 1 RPC. Migration `019_rpc_get_course_detail.sql` |
| 11 | `get_landing_data` RPC | ✅ Applied to production | Replaced 6 queries with 1 RPC + 30s cache. Migration `020_rpc_get_landing_data.sql` |
| 12 | `Promise.all()` on `getUnassignedInstructors` | ✅ Fixed | 2 sequential → parallel |
| 13 | `Promise.all()` on `getProjectStats` | ✅ Fixed | 4 sequential → parallel |

### Feature Work (COMPLETED)
| # | Feature | Status | Details |
|---|---------|--------|---------|
| 14 | Instructor assignment in Course Builder | ✅ Done | Inline CourseInfoEditor with auto-save to DB |
| 15 | Submissions review pages | ✅ Done | `/admin/submissions` + `/instructor/submissions` |
| 16 | Per-course submission grouping | ✅ Done | Collapsible accordion with pending count badges |
| 17 | Instructor API access | ✅ Done | 23 admin API routes now allow instructor role |
| 18 | Admin Instructor View | ✅ Done | Admins see all courses; instructors see assigned only |
| 19 | Course info view-only for instructors | ✅ Done | Title, description, cover, status, instructors read-only |
| 20 | Migration file renaming | ✅ Done | All 22 migrations renamed to 001-022 sequential |

### Impact of Changes
- **Student course page**: 5-7 sequential queries → **1 RPC call** (~150ms response time)
- **Landing page**: 6 sequential queries → **1 RPC call** + 30s cache for guests
- **Three.js**: ~36MB JS loaded lazily after page render
- **Content editors**: Only active editor loads (1 of 4)
- **Polling fix**: Cache no longer deleted, other students benefit from cached data
- **Security**: Video PUT no longer allows arbitrary column updates
- **Data integrity**: Unique constraints prevent duplicate progress/enrollment records
- **Instructor access**: Full course-building capability without admin role
- **Server load**: Estimated **70-80% reduction** in DB queries for student + landing traffic

### Remaining Issues (for next session after push)
- Phase 3 remaining: `Promise.all()` on instructor dashboard, submission approval (issues #36, #26)
- Phase 3 remaining: N+1 fixes (instructor profiles #20, module counts #34, article joins #21)
- Phase 4: More RPCs (analytics #16, lesson stats #17, lesson completion #13, reorder #11, lessons N+1 #3)
- Phase 5: Component optimization (`useMemo`/`useCallback` #38-40, `next/image` #29, dead code #42)
- Phase 6: SSO fix #5, pagination #22, admin client centralization #31, slug race #32, LRU cache #8, RLS #10

---

## ⚠️ CRITICAL: Production Server Constraints

> The production server has **1 CPU core, 965MB RAM, 25GB disk** and is already swapping 733MB.
> This makes ALL performance optimizations **survival-critical**, not nice-to-have.

| Resource | Value | Impact |
|----------|-------|--------|
| CPU | 1 core | Every unnecessary query steals CPU from other requests |
| RAM | 965MB (260MB free) | Unbounded caches will cause OOM crashes |
| Disk | 25GB (5.6GB free) | Large log files or temp data can fill disk |
| Swap | 733MB/2GB used | Already memory-constrained |
| DB connections | 20 per pool | N+1 queries exhaust the connection pool fast |

### Priority Order for This Server
Given the constraints, the **highest impact** fixes are:
1. ✅ Done: RPC for student course page (saves 4-6 connections per request)
2. **Next:** Dynamic import Three.js (~36MB) — frees RAM immediately
3. **Next:** Dynamic import content editors — only loads what's needed
4. **Next:** `Promise.all()` on remaining endpoints — reduces connection pool pressure
5. **Next:** Bound all caches with max size — prevent OOM
6. **Later:** More RPCs for analytics, lesson completion, reorder
