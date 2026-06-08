# Course Builder Design Spec

> Date: 2026-06-02
> Status: Approved
> Phase: 1 — Dashboard Redesign

---

## Overview

Replace 16 disconnected admin table-manager pages with a unified split-panel course builder. One page to build an entire course: modules, lessons, and all content types.

## Design Decisions

- **Layout**: Split panel (curriculum tree left, content editor right)
- **Save**: Manual save + unsaved changes warning
- **Quiz**: Stacked cards (each question shows options inline)
- **Navigation**: Admin sidebar with links to all sections

## DB Constraints the UI Must Enforce

### Enums (exact values)
- `course_status`: `draft` | `published` | `archived`
- `lesson_type`: `article` | `video` | `quiz` | `project` | `other`
- `node_status`: `visible` | `hidden`
- `quiz_question_type`: `multiple_choice` | `short_answer` | `true_false`
- `submission_platform`: `github` | `google_drive` | `onedrive` | `dropbox` | `gitlab` | `bitbucket` | `other`
- `user_role`: `student` | `instructor` | `admin`

### Key Rules
1. Course slug must be globally unique
2. Each lesson has exactly ONE content record (article OR video OR quiz OR project) — enforced by UNIQUE on lesson_id in each content table
3. Quiz passing_score default = 0, time_limit_minutes nullable
4. Question type default = `multiple_choice`, points default = 1
5. Question option content is NOT NULL, is_correct default = false
6. Project submission_platform must be one of the 7 enum values
7. Course must have status `draft` or `published` to edit
8. Modules cascade-delete with course, lessons cascade-delete with module
9. Instructors assigned via `course_instructors` table (composite unique on course_id + instructor_id)

## Page Structure

### Admin Sidebar Navigation
```
🏠 Dashboard     → /admin
📚 Courses       → /admin/courses
👥 Users         → /admin/users
📊 Analytics     → /admin/analytics
📝 Enrollments   → /admin/enrollments
📋 Progress      → /admin/lesson-progress
📜 Logs          → /admin/logs
🔗 Supabase      → external link
```

### Course List Page: `/admin/courses`
- Grid/list of all courses with status badges
- "Create Course" button → creates draft → redirects to builder
- Each course card: title, description, status badge, module count, lesson count, created date
- Click course → goes to builder

### Course Builder: `/admin/courses/[courseId]/builder`

#### Header
- Back arrow → /admin/courses
- Course title (editable inline)
- Status badge (draft/published/archived)
- "Last saved at X" timestamp
- [Save] button (primary)
- [Publish/Unpublish] toggle button

#### Left Panel: Curriculum Tree (~300px wide)
- "Course Info" link at top (selected by default)
- Expandable modules with lessons underneath
- Each module: title, expand/collapse arrow, "+ Lesson" button, edit/delete icons
- Each lesson: type icon + title + status dot (green=has content, yellow=empty, red=error)
- "+ Add Module" button at bottom
- Adding module: inline form appears at bottom (title + description + [Create])
- Adding lesson: inline form under module (title + type dropdown + [Create])
  - Type dropdown: Article | Video | Quiz | Project (no "other" in UI — only for data migration)
- Lesson type icons: 📹 Video, 📄 Article, 📝 Quiz, 📦 Project
- Reorder: up/down arrow buttons on each item

#### Right Panel: Content Editor
Changes based on what's selected in the left panel.

##### Course Info View
- Title (text, required)
- Slug (auto-generated from title, editable, unique validation)
- Description (textarea, optional)
- Cover Image (imgbb upload with drag-and-drop + URL input)
- Status (dropdown: draft/published/archived)
- Instructors (multi-select from users with role=instructor)

##### Article Editor
- Title (text, optional — defaults to lesson title)
- Content (large textarea with markdown preview toggle)
- Summary (textarea, optional)
- Reading time (auto-calculated from content, editable)
- Preview toggle button shows rendered markdown

##### Video Editor
- URL (text, auto-detect YouTube/Vimeo)
- Provider (auto-detected: youtube/vimeo/other, manual override)
- Video ID (auto-extracted from URL)
- Duration (minutes:seconds input, stored as seconds)
- Transcript (textarea, optional)

##### Quiz Editor (Stacked Cards)
- Quiz title (text, optional)
- Description (textarea, optional)
- Passing score (number input, default 0, 0-100)
- Time limit (number input, minutes, optional)
- Questions section: stacked cards
  - Each card:
    - Header: Q number, type badge, points input (default 1), up/down/delete buttons
    - Question text (textarea, required)
    - Options section:
      - For multiple_choice: list of option inputs, each with correct radio + delete
      - For true_false: auto-created True/False with correct radio
      - For short_answer: no options, just the question text
    - "+ Add Option" link (for multiple_choice only)
  - "+ Add Question" button at bottom with type dropdown

##### Project Editor
- Title (text, optional — defaults to lesson title)
- Description (textarea, optional)
- Submission instructions (textarea with markdown, optional)
- Submission platform (dropdown: github/gitlab/bitbucket/google_drive/onedrive/dropbox/other)

#### Unsaved Changes Warning
- Yellow bar at bottom: "You have unsaved changes" [Discard] [Save]
- beforeunload event on window to prevent accidental tab close
- Next.js router event to prevent navigation within the app
- "Discard" reloads from server, "Save" saves and clears warning

## Instructor Dashboard

### Pages
- `/instructor` — Dashboard home with assigned course cards
- `/instructor/courses/[courseId]` — Same builder UI, but:
  - Scoped to instructor's assigned courses only
  - Cannot change course status (no publish/unpublish)
  - Cannot create new courses
- `/instructor/courses/[courseId]/students` — Student progress (existing component)
- `/instructor/videos` — Quick shortcut (kept)

### Instructor Sidebar
```
🏠 Dashboard        → /instructor
📚 My Courses       → /instructor (courses section)
🎥 Videos           → /instructor/videos
```

## Files to Delete
```
src/app/admin/tables/page.tsx
src/app/admin/question-options/page.tsx
src/app/admin/quiz-questions/page.tsx
src/app/admin/settings/page.tsx
src/app/admin/progress-debug/page.tsx
src/app/instructor/tables/page.tsx
src/components/students/ProjectSubmissionForm.tsx
```

## Files to Create
```
src/app/admin/courses/page.tsx                    — Course list
src/app/admin/courses/[courseId]/builder/page.tsx — Builder page
src/components/admin/AdminSidebar.tsx              — Sidebar nav
src/components/admin/CourseBuilder.tsx             — Split-panel builder
src/components/admin/CurriculumTree.tsx            — Left panel tree
src/components/admin/CourseInfoEditor.tsx          — Course info form
src/components/admin/ArticleEditor.tsx             — Article markdown editor
src/components/admin/VideoEditor.tsx               — Video form
src/components/admin/QuizEditor.tsx                — Stacked cards quiz builder
src/components/admin/ProjectEditor.tsx             — Project form
src/components/admin/ContentEditor.tsx             — Routes to correct editor by type
src/components/instructor/InstructorSidebar.tsx    — Instructor sidebar nav
src/hooks/useUnsavedChanges.ts                     — Unsaved changes detection hook
```

## Files to Modify
```
src/app/admin/layout.tsx                  — Add sidebar
src/app/admin/page.tsx                    — Streamlined dashboard
src/app/instructor/layout.tsx             — Add sidebar
src/app/instructor/page.tsx               — New home
src/components/instructor/InstructorDashboard.tsx — Remove tables mode
```

## Implementation Order
1. Admin sidebar + layout
2. Course list page
3. Course builder shell (split panel, curriculum tree)
4. Course info editor
5. Article editor
6. Video editor
7. Quiz editor (stacked cards)
8. Project editor
9. Unsaved changes warning
10. Instructor sidebar + dashboard rebuild
11. Delete old pages
