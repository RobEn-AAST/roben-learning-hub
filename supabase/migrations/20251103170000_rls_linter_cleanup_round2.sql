-- Linter cleanup: remove multiple permissive policies and duplicate indexes
-- - Split lesson_progress modify into granular actions (no implicit SELECT)
-- - Drop legacy comprehensive policies on questions/question_options
-- - Drop duplicate indexes flagged by linter

BEGIN;

-- 1) lesson_progress: replace broad modify policy with granular INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "lesson_progress_modify" ON public.lesson_progress;

CREATE POLICY "lesson_progress_insert" ON public.lesson_progress
FOR INSERT TO authenticated
WITH CHECK (
  (user_id = (SELECT auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'::public.user_role
  )
);

CREATE POLICY "lesson_progress_update" ON public.lesson_progress
FOR UPDATE TO authenticated
USING (
  (user_id = (SELECT auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'::public.user_role
  )
)
WITH CHECK (
  (user_id = (SELECT auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'::public.user_role
  )
);

CREATE POLICY "lesson_progress_delete" ON public.lesson_progress
FOR DELETE TO authenticated
USING (
  (user_id = (SELECT auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'::public.user_role
  )
);

-- keep "lesson_progress_select" as the only SELECT policy

-- 2) Drop legacy comprehensive policies that overlap with new ones
DROP POLICY IF EXISTS "question_options_comprehensive" ON public.question_options;
DROP POLICY IF EXISTS "questions_comprehensive" ON public.questions;

-- 3) Drop duplicate indexes (leave one canonical index per key)
-- course_enrollments: keep idx_course_enrollments_user_course
DROP INDEX IF EXISTS public.idx_enrollments_user_course;

-- question_options: keep idx_question_options_question
DROP INDEX IF EXISTS public.idx_question_options_question_id;

-- questions: drop redundant id index variant and keep the other (or PK)
DROP INDEX IF EXISTS public.idx_questions_id;

COMMIT;