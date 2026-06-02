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
- `supabase/migrations/` — Database schema migrations (20+)

## Key Patterns
- **Role-based access**: student / instructor / admin (enforced via RLS + middleware)
- **Service role key**: used ONLY in API routes for admin operations bypassing RLS
- **API routes** in `/api/admin/*` bypass RLS; client-side uses anon key with RLS
- **React Query**: 5min stale time, 30min GC, exponential backoff retries
- **Dynamic imports**: used for below-the-fold content (hero sections, 3D elements)
- **Content types**: article (markdown), video (embed), quiz (interactive), project (submission)

## Database
- PostgreSQL via Supabase with comprehensive RLS
- Core tables: courses → modules → lessons → [articles|videos|quizzes|projects]
- Progress: lesson_progress, quiz_attempts, user_answers, project_submissions
- RPC functions for quiz scoring and lesson completion

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
