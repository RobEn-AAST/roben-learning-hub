# CLAUDE.md — RobEn Learning Hub

## Project Overview
RobEn Learning Hub is a Coursera-style LMS for the RobEn club at AAST. Delivers courses with articles, videos, quizzes, and projects to club members. Already deployed on RobEn's own server.

## Tech Stack
- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Supabase** — PostgreSQL, Auth, RLS, Realtime, Edge Functions
- **Tailwind CSS** + **shadcn/ui** + **Framer Motion**
- **TanStack React Query** — data fetching/caching
- **Three.js** + React Three Fiber — 3D hero background

## How to Run
```bash
npm install && npm run dev   # → http://localhost:3000
npm run build && npm start   # Production
docker compose up            # Supabase stack (optional local)
```

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
IMGBB_API_KEY=
NEXT_PUBLIC_ROBEN_SSO_*=
```

## Architecture
- `src/app/` — Next.js App Router pages + API routes
- `src/components/` — React components (ui/, admin/, instructor/, project/, quiz/)
- `src/services/` — Data fetching service layer
- `src/hooks/` — Custom React hooks (useAuth, useQueryCache, useCourseLearn)
- `src/lib/` — Supabase client setup, utilities
- `src/types/` — TypeScript type definitions
- `supabase/migrations/` — Database schema migrations (22 files, numbered 001-022)

## Key Patterns
- **Role-based access**: student / instructor / admin (enforced via RLS + middleware)
- **Admin API routes** (`/api/admin/*`) allow both `admin` and `instructor` roles for course-building operations; only `admin` for user management, activity logs
- **Service role key**: used ONLY in API routes for operations bypassing RLS
- **Client-side services** use anon key with RLS
- **React Query**: 5min stale time, 30min GC, exponential backoff retries
- **Dynamic imports**: Three.js (client wrapper), all 4 content editors in CourseBuilder
- **Content types**: article (markdown), video (embed), quiz (interactive), project (submission)
- **Instructor view**: admins see all courses; instructors see only assigned courses. Course info is view-only for instructors.

## Course Builder (Primary Admin/Instructor Interface)
The **CourseBuilder** (`src/components/admin/CourseBuilder.tsx`) is the main way to manage courses:
- **Routes**: `/admin/courses/[courseId]/builder` and `/instructor/courses/[courseId]/builder`
- **Left panel**: curriculum tree with modules + lessons (reorder, add, delete)
- **Right panel**: content editors per lesson type (ArticleEditor, VideoEditor, QuizEditor, ProjectEditor) — all dynamically imported
- **Course Info panel**: includes instructor assignment with auto-save (admin only; view-only for instructors)
- **Batch-save API**: `/api/admin/quizzes/[id]/batch-save` — single request for quiz + questions + options
- **Visibility toggle**: completeness check before making lessons visible to students
- **Hidden lessons**: filtered from student API response, excluded from progress and stats
- **Student polling**: learn page polls every 30s with `_nocache` param for quick admin→student sync
- **Lesson deletion**: cascade deletes all associated content
- **Undo button**: floating bar reverts unsaved changes with confirmation dialog

## Submission Review
- **Admin**: `/admin/submissions` — sees all submissions grouped by course
- **Instructor**: `/instructor/submissions` — sees only their course submissions
- **Per-course grouping**: collapsible accordion with pending count badges
- **Backend**: existing API handles role-based filtering, approval/rejection with feedback

### Key Files
- `CourseBuilder.tsx` — main builder component
- `ArticleEditor.tsx`, `VideoEditor.tsx`, `QuizEditor.tsx`, `ProjectEditor.tsx` — content editors
- `CourseInfoEditor.tsx`, `CoursesListClient.tsx`, `CourseViewClient.tsx` — supporting components
- `AdminSidebar.tsx`, `AdminMobileNav.tsx` — admin navigation
- `InstructorSidebar.tsx`, `InstructorMobileNav.tsx` — instructor navigation
- Builder pages: `src/app/admin/courses/[courseId]/builder/page.tsx`, `src/app/instructor/courses/[courseId]/builder/page.tsx`

## Database
- PostgreSQL via Supabase with comprehensive RLS
- Core tables: courses → modules → lessons → [articles|videos|quizzes|projects]
- Quiz tables: quizzes → questions → question_options
- Progress: lesson_progress, quiz_attempts, user_answers, project_submissions
- RPC functions for quiz scoring and lesson completion
- **`get_course_detail(course_id, user_id)`** — main student course page RPC (1 call vs 5-7)
- **`get_landing_data(user_id)`** — landing page RPC + 30s cache for guests (1 call vs 6)
- Unique constraints on `lesson_progress(user_id, lesson_id)` and `course_enrollments(user_id, course_id)`
- Migrations numbered 001-022 in `supabase/migrations/`

## Performance Optimizations (Applied June 2026)
- Student course endpoint uses `get_course_detail` RPC (1 query vs 5-7)
- Landing page uses `get_landing_data` RPC + 30s cache for guests (1 query vs 6)
- Three.js dynamically imported via client wrapper (~36MB saved)
- All 4 content editors dynamically imported in CourseBuilder
- Cache on `_nocache` skips read but doesn't delete (other students still benefit)
- Polling uses `useRef` to avoid stale closures
- Video PUT has field whitelist (no mass assignment)
- `Promise.all()` on `getUnassignedInstructors` and `getProjectStats`
- ~326 `console.log` removed from production code
- Redundant database indexes dropped
- See `roben-learning-hub-audit-report.md` for full details and remaining items

## Production Setup
- Self-hosted Supabase at `https://supabase.roben.club`
- Deployed via Vercel (auto-deploys from GitHub `main` branch)
- DB migrations are manual — use SQL Editor in Supabase Dashboard or `APPLY_*.sql` files in `supabase/migrations/`
- Service role key must match the server's JWT secret (not the default demo key)
- Server env reference saved in `docs/server-env-reference.md`

## ⚠️ Server Constraints (CRITICAL — read before writing any code)
- **1 CPU core, 965MB RAM, 25GB disk** — very constrained
- Server is already using swap (733MB of 2GB)
- This is the SECOND site on this server — the main RobEn site runs here too
- Connection pool max: 20 per pool, 100 max client
- **Rules for all new code:**
  - Use RPCs instead of multiple sequential queries
  - Use `Promise.all()` for independent queries
  - Bound all caches with max size (no unbounded Maps)
  - Dynamic-import heavy components (Three.js, editors)
  - Specify needed columns, never `select('*')`
  - No console.log in production

## Conventions
- TypeScript strict mode — always type new code
- shadcn/ui components in `src/components/ui/`
- Service files in `src/services/` for data operations
- API routes in `src/app/api/` with proper auth checks
- Admin components in `src/components/admin/`
- Instructor components in `src/components/instructor/`

## Common Commands
```bash
npm run dev          # Dev server
npm run build        # Production build
npm run lint         # ESLint
npx supabase db reset  # Reset local database
```

## Git
- Main branch: `main`
- Git user: Mesbah
- Repo: RobEn-AAST/roben-learning-hub (GitHub)
