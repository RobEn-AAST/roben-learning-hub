# RobEn Learning Hub — Development Plan

> Last updated: 2026-06-02
> Maintained by: Mesbah (RobEn club, AAST)

---

## How to Run the Dev Server

### Prerequisites
- Node.js 18+ installed
- Docker & Docker Compose (for Supabase)

### Step 1: Install Dependencies
```bash
cd /home/mesbah/Desktop/RobEn/Learning-Hub
npm install
```

### Step 2: Start Local Supabase
```bash
# Option A: Start the full Supabase stack
docker compose up -d

# Option B: Using Supabase CLI (if installed)
npx supabase start
```

### Step 3: Start the Next.js Dev Server
```bash
npm run dev
# → http://localhost:3000
```

### Step 4: Access Services
| Service | URL |
|---------|-----|
| Website | http://localhost:3000 |
| Supabase Studio (local) | http://127.0.0.1:55421 → Studio UI |
| Supabase API | http://127.0.0.1:55421 |
| Supabase Studio (production) | https://djxjxazxqmzqjyypuouf.supabase.co |

### Switching Between Local and Production
Edit `.env`:
- **Local**: uncomment the LOCAL section, comment out PRODUCTION
- **Production**: uncomment the PRODUCTION section, comment out LOCAL

### Before Pushing to GitHub
```bash
npm run lint       # Check for lint errors
npm run build      # Verify production build works
```

---

## Current State Summary

### What's Working
- ✅ Authentication (Supabase Auth + RobEn.club SSO)
- ✅ Role-based access (student / instructor / admin)
- ✅ Course catalog and enrollment
- ✅ Coursera-style course player with sidebar
- ✅ Article lessons (markdown + syntax highlighting)
- ✅ Video lessons (YouTube embed)
- ✅ Quiz system (multiple choice, true/false, short answer)
- ✅ Project submissions (URL-based)
- ✅ Progress tracking (sequential lesson completion)
- ✅ Admin dashboard (16 pages)
- ✅ Instructor dashboard (3 pages)
- ✅ Student dashboard
- ✅ 3D hero background, animations
- ✅ Responsive design, dark/light theme

### What's Broken or Bad
- ❌ Admin dashboard is 16 disconnected table managers — creating a course requires 6-7 pages
- ❌ `/admin/tables` is a 700-line router that duplicates dedicated routes
- ❌ Quiz creation requires 3 separate pages (quiz → questions → options)
- ❌ Settings page is fake (buttons just show alerts)
- ❌ `/admin/courses` link → 404
- ❌ `console.log` debug code left in production components
- ❌ Instructor dashboard reuses 9 admin components directly (no scoping)
- ❌ Instructor can see/modify ALL content, not just their assigned courses
- ❌ Two competing ProjectSubmissionForm components with different APIs
- ❌ Progress can exceed 100% due to missing unique constraint on `(user_id, lesson_id)`
- ❌ Learn page (807 lines) ignores optimized hooks from `useCourseLearn.ts`
- ❌ No notifications system
- ❌ No certificate generation
- ❌ No course search

---

## Phase 1: Dashboard Redesign

### Goal
Remove the disconnected table managers. Build a unified course builder. Make content creation easy.

### 1.1 Admin Dashboard Rebuild

#### Pages to REMOVE
| Page | Reason |
|------|--------|
| `/admin/tables` | 700-line router — Supabase Studio does this better |
| `/admin/question-options` | Merge into quiz builder |
| `/admin/quiz-questions` | Merge into quiz builder |
| `/admin/settings` | Fake — all buttons non-functional |
| `/admin/progress-debug` | Dev tool, not production |

#### Pages to KEEP (refactored)
| Page | Changes |
|------|---------|
| `/admin` | New dashboard home with real stats |
| `/admin/users` | Keep as is |
| `/admin/analytics` | Keep as is |
| `/admin/enrollments` | Keep as is |
| `/admin/logs` | Keep as is |
| `/admin/lesson-progress` | Keep as is |

#### Pages to REBUILD
| Page | What It Becomes |
|------|----------------|
| `/admin/courses` | Course list page (new route — fix the 404) |
| `/admin/courses/[courseId]/builder` | **Unified Course Builder** (NEW) |
| `/admin/modules` | Removed → merged into Course Builder |
| `/admin/lessons` | Removed → merged into Course Builder |
| `/admin/quizzes` | Removed → merged into Course Builder |
| `/admin/projects` | Removed → merged into Course Builder |

#### New: Unified Course Builder (`/admin/courses/[courseId]/builder`)

A single page with tabbed interface:

**Tab 1: Course Info**
- Title, description, slug (auto)
- Cover image (imgbb upload)
- Status (draft/published/archived)
- Instructor assignment
- Publish/Unpublish button

**Tab 2: Curriculum** (drag-and-drop)
- Tree view: Course → Modules → Lessons
- "Add Module" button → inline form
- "Add Lesson" under any module → choose type → inline form
- Drag to reorder modules and lessons
- Click lesson → opens content editor
- Delete with confirmation
- Each item shows: title, type badge, status indicator

**Tab 3: Content Editor** (per lesson)
- Shows when a lesson is selected in Curriculum tab
- **Article**: Markdown editor with live preview + reading time
- **Video**: URL input, provider detection, duration, transcript
- **Quiz**: Unified builder showing questions AND options together
  - Add question → inline form
  - Add options directly under each question
  - Reorder questions and options
  - Set correct answer
  - True/false auto-creates options
  - Preview quiz button
- **Project**: Title, description, instructions (markdown), platform selector
- **Assignment**: Code editor + test cases (Phase 2)

**Tab 4: Settings**
- Enrollment type (open/invite)
- Lesson access order (sequential/free)
- Course visibility

#### Admin Sidebar Navigation
```
🏠 Dashboard
📚 Courses
👥 Users
📊 Analytics
📝 Enrollments
📋 Lesson Progress
📜 Activity Logs
🔗 Supabase Studio
```

The **"Supabase Studio"** link opens the server's Supabase admin panel:
- Local: `http://127.0.0.1:55421` (or wherever Supabase Studio runs)
- Production: `https://supabase.com/dashboard/project/djxjxazxqmzqjyypuouf`
- This replaces the need for the Tables hub page entirely

#### Access Control
- **Admin**: Can access both `/admin` and `/instructor`
- **Instructor**: Can ONLY access `/instructor`, not `/admin`
- Current behavior: admin middleware checks for `admin` role only
- Instructor middleware checks for `instructor` OR `admin` role
- This is correct — keep it this way

### 1.2 Instructor Dashboard Rebuild

#### Pages to REMOVE
| Page | Reason |
|------|--------|
| `/instructor/tables` | Same as admin — replaced by scoped course builder |

#### Pages to REBUILD
| Page | What It Becomes |
|------|----------------|
| `/instructor` | New dashboard home with course cards |
| `/instructor/courses/[courseId]` | **Scoped Course Builder** — same UI as admin builder but filtered to instructor's courses |
| `/instructor/courses/[courseId]/students` | Student progress (keep existing, enhance) |

#### Pages to KEEP
| Page | Changes |
|------|---------|
| `/instructor/videos` | Keep as quick shortcut |

#### Instructor-Specific Rules
- Cannot create new courses (must be assigned by admin)
- Cannot change course status (publish/unpublish)
- Cannot manage users or enrollments
- CAN edit curriculum, lessons, content within assigned courses
- CAN view student progress and review project submissions
- All API calls scoped to assigned courses via `getAllowedInstructorCourseIds()`

#### Instructor Sidebar Navigation
```
🏠 Dashboard
📚 My Courses
🎥 Videos
```

### 1.3 Components to Build

| Component | Purpose |
|-----------|---------|
| `CourseBuilder.tsx` | Main builder orchestrator with tabs |
| `CurriculumEditor.tsx` | Drag-and-drop module/lesson tree |
| `ContentEditor.tsx` | Route to correct editor based on lesson type |
| `ArticleEditor.tsx` | Markdown editor with preview |
| `VideoEditor.tsx` | Video URL + metadata form |
| `QuizBuilder.tsx` | Unified quiz + questions + options builder |
| `ProjectEditor.tsx` | Project config form |
| `AdminSidebar.tsx` | Admin navigation sidebar |
| `InstructorSidebar.tsx` | Instructor navigation sidebar |
| `SupabaseStudioLink.tsx` | Link/button to open Supabase admin |

### 1.4 Bug Fixes (included in Phase 1)

| Fix | Description |
|-----|-------------|
| Add unique constraint | `(user_id, lesson_id)` on `lesson_progress` table |
| Remove duplicate component | Delete `/components/students/ProjectSubmissionForm.tsx` |
| Fix platform enum | Align frontend platforms with API enum |
| Remove console.logs | Clean debug logging from quiz components |
| Fix dead link | `/admin/courses` should route to course list |
| Fix learn page | Refactor to use `useCourseLearn.ts` hooks |
| Fix disabled activity | Re-enable "Recent Activity" on admin dashboard |

### 1.5 Files Changed

#### Delete
```
src/app/admin/tables/page.tsx
src/app/admin/question-options/page.tsx
src/app/admin/quiz-questions/page.tsx
src/app/admin/settings/page.tsx
src/app/admin/progress-debug/page.tsx
src/app/instructor/tables/page.tsx
src/components/students/ProjectSubmissionForm.tsx (duplicate)
```

#### Create
```
src/app/admin/courses/page.tsx                           (course list)
src/app/admin/courses/[courseId]/builder/page.tsx        (unified builder)
src/components/admin/CourseBuilder.tsx
src/components/admin/CurriculumEditor.tsx
src/components/admin/ContentEditor.tsx
src/components/admin/ArticleEditor.tsx
src/components/admin/VideoEditor.tsx
src/components/admin/QuizBuilder.tsx
src/components/admin/ProjectEditor.tsx
src/components/admin/AdminSidebar.tsx
src/components/admin/SupabaseStudioLink.tsx
src/app/instructor/courses/[courseId]/page.tsx           (scoped builder)
src/components/instructor/InstructorSidebar.tsx
src/components/instructor/InstructorCourseBuilder.tsx
```

#### Modify
```
src/app/admin/layout.tsx                  (add sidebar)
src/app/admin/page.tsx                    (new dashboard home)
src/components/admin/AdminDashboard.tsx    (streamlined)
src/app/instructor/layout.tsx             (add sidebar)
src/app/instructor/page.tsx               (new home)
src/components/instructor/InstructorDashboard.tsx (streamlined)
src/app/courses/[courseId]/learn/page.tsx (use hooks, not inline)
```

---

## Phase 2: Task & Assignment System

### Goal
Students complete coding tasks IN the browser. Python, JavaScript, C++ — write code, run it, see output, get auto-graded. No leaving the website for most tasks.

### New Database Tables

```sql
-- New lesson type enum value: 'assignment'
ALTER TYPE lesson_type ADD VALUE 'assignment';

-- Assignments (1:1 with lessons of type 'assignment')
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  starter_code TEXT DEFAULT '',
  language TEXT NOT NULL DEFAULT 'python',
  max_submissions INTEGER DEFAULT 10,
  due_date TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Test cases for auto-grading
CREATE TABLE assignment_test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  input TEXT DEFAULT '',
  expected_output TEXT NOT NULL,
  is_hidden BOOLEAN DEFAULT false,
  points INTEGER DEFAULT 1,
  position INTEGER DEFAULT 0
);

-- Student submissions
CREATE TABLE assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  language TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','running','passed','failed','error')),
  output TEXT,
  test_results JSONB DEFAULT '[]',
  score NUMERIC(5,2) CHECK (score >= 0 AND score <= 100),
  submitted_at TIMESTAMPTZ DEFAULT now(),
  graded_at TIMESTAMPTZ,
  UNIQUE(assignment_id, user_id)
);

-- Version history (git-like)
CREATE TABLE assignment_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  commit_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Code Execution Engine
- **Judge0 CE** — self-hosted on the same server
- Docker-based sandboxing
- 60+ languages supported
- REST API: `POST /submissions { source_code, language_id, stdin } → { stdout, stderr, status }`

### New Components
```
src/components/assignment/AssignmentRunner.tsx    (student code editor + output)
src/components/assignment/CodeEditor.tsx          (Monaco Editor wrapper)
src/components/assignment/OutputPanel.tsx         (stdout, stderr, test results)
src/components/assignment/AssignmentEditor.tsx    (admin/instructor: create assignments)
src/components/assignment/TestCaseManager.tsx     (admin/instructor: manage test cases)
```

### New API Routes
```
src/app/api/admin/assignments/            (CRUD)
src/app/api/admin/assignments/[id]/test-cases/  (test case CRUD)
src/app/api/assignments/[id]/submit/     (student submission)
src/app/api/assignments/[id]/execute/    (run code via Judge0)
```

---

## Phase 3: Bug Fixes & Polish

| Item | Description |
|------|-------------|
| Unique constraint | Add `(user_id, lesson_id)` on `lesson_progress` |
| Platform enum fix | Align frontend 10 platforms with API 7 |
| Learn page refactor | Use `useCourseLearn.ts` hooks instead of 807-line inline |
| Remove dead code | console.logs, disabled activity feed, debug pages |
| Error boundaries | Add global error boundary component |
| Loading states | Add proper loading indicators for lesson transitions |

---

## Phase 4: New Features

| Feature | Priority |
|---------|----------|
| Notification system | High |
| Certificate generation | High |
| Course search | High |
| Discussion forum | Medium |
| Course ratings/reviews | Medium |
| User profile pictures | Medium |
| Export reports (CSV/PDF) | Low |
| PWA / offline support | Low |

---

## Implementation Order

### Step 1: Get Dev Running (NOW)
```bash
npm install
docker compose up -d    # or npx supabase start
npm run dev
```

### Step 2: Phase 1 — Dashboard Redesign
1. Create admin sidebar component
2. Create course list page (`/admin/courses`)
3. Build unified Course Builder (`/admin/courses/[courseId]/builder`)
4. Build Quiz Builder (unified questions + options)
5. Build Article Editor (markdown + preview)
6. Build Video Editor
7. Build Project Editor
8. Remove old pages (tables, question-options, quiz-questions, settings, progress-debug)
9. Add Supabase Studio link
10. Rebuild instructor dashboard (scoped builder + sidebar)
11. Remove instructor tables page

### Step 3: Phase 2 — Assignment System
1. Add database migration (new tables + enum value)
2. Set up Judge0 CE (Docker)
3. Build Assignment Runner (code editor + output)
4. Build Assignment Editor (admin/instructor)
5. Build auto-grading pipeline
6. Integrate into course player

### Step 4: Phase 3 — Bug Fixes
### Step 5: Phase 4 — New Features

---

## Memory Files (AI Context)

All project knowledge is saved in `.claude/memory/`:
- `MEMORY.md` — Index of all memory files
- `project-overview.md` — Architecture and tech stack
- `tech-stack-dev-setup.md` — How to run and deploy
- `pages-routes.md` — All pages and API routes
- `features-implemented.md` — What's working
- `features-planned.md` — What's TODO
- `database-schema.md` — Tables, RPCs, migrations
- `user-context.md` — User preferences
- `ux-issues-found.md` — UX problems discovered
- `dashboard-redesign-plan.md` — Dashboard fix plan
- `task-assignment-system-plan.md` — Assignment system plan
