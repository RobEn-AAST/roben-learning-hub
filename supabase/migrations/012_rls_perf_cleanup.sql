-- RLS performance cleanup and index deduplication
-- - Wrap auth.* calls with SELECT to avoid per-row initplans
-- - Remove duplicate permissive SELECT policies
-- - Avoid FOR ALL on modify policies (which implied SELECT)
-- - Drop duplicate indexes flagged by linter

BEGIN;

-- 1) Questions: ensure auth wrappers and keep single SELECT policy
DROP POLICY IF EXISTS "questions_quiz_attempt_access" ON public.questions;
CREATE POLICY "questions_quiz_attempt_access" ON public.questions
FOR SELECT
USING (
  public.is_admin()
  OR (
    public.is_instructor()
    AND EXISTS (
      SELECT 1
      FROM public.quizzes q
      JOIN public.lessons l ON l.id = q.lesson_id
      JOIN public.modules m ON m.id = l.module_id
      WHERE q.id = questions.quiz_id
      AND public.is_instructor_of_course(m.course_id)
    )
  )
  OR (
    (SELECT auth.role()) = 'authenticated'
    AND EXISTS (
      SELECT 1
      FROM public.quiz_attempts qa
      WHERE qa.quiz_id = questions.quiz_id
      AND qa.user_id = (SELECT auth.uid())
    )
  )
);

-- Avoid overlapping SELECT through a broad FOR ALL modify policy
DROP POLICY IF EXISTS "questions_modify" ON public.questions;
-- Recreate granular modify policies without affecting SELECT
CREATE POLICY "questions_insert" ON public.questions
FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin() OR (
    public.is_instructor() AND EXISTS (
      SELECT 1
      FROM public.quizzes q
      JOIN public.lessons l ON l.id = q.lesson_id
      JOIN public.modules m ON m.id = l.module_id
      WHERE q.id = questions.quiz_id
      AND public.is_instructor_of_course(m.course_id)
    )
  )
);
CREATE POLICY "questions_update" ON public.questions
FOR UPDATE TO authenticated
USING (
  public.is_admin() OR (
    public.is_instructor() AND EXISTS (
      SELECT 1
      FROM public.quizzes q
      JOIN public.lessons l ON l.id = q.lesson_id
      JOIN public.modules m ON m.id = l.module_id
      WHERE q.id = questions.quiz_id
      AND public.is_instructor_of_course(m.course_id)
    )
  )
)
WITH CHECK (
  public.is_admin() OR (
    public.is_instructor() AND EXISTS (
      SELECT 1
      FROM public.quizzes q
      JOIN public.lessons l ON l.id = q.lesson_id
      JOIN public.modules m ON m.id = l.module_id
      WHERE q.id = questions.quiz_id
      AND public.is_instructor_of_course(m.course_id)
    )
  )
);
CREATE POLICY "questions_delete" ON public.questions
FOR DELETE TO authenticated
USING (
  public.is_admin() OR (
    public.is_instructor() AND EXISTS (
      SELECT 1
      FROM public.quizzes q
      JOIN public.lessons l ON l.id = q.lesson_id
      JOIN public.modules m ON m.id = l.module_id
      WHERE q.id = questions.quiz_id
      AND public.is_instructor_of_course(m.course_id)
    )
  )
);

-- 2) Question options: same adjustments
DROP POLICY IF EXISTS "question_options_quiz_attempt_access" ON public.question_options;
CREATE POLICY "question_options_quiz_attempt_access" ON public.question_options
FOR SELECT
USING (
  public.is_admin()
  OR (
    public.is_instructor()
    AND EXISTS (
      SELECT 1
      FROM public.questions q
      JOIN public.quizzes qz ON qz.id = q.quiz_id
      JOIN public.lessons l ON l.id = qz.lesson_id
      JOIN public.modules m ON m.id = l.module_id
      WHERE q.id = question_options.question_id
      AND public.is_instructor_of_course(m.course_id)
    )
  )
  OR (
    (SELECT auth.role()) = 'authenticated'
    AND EXISTS (
      SELECT 1
      FROM public.questions q
      JOIN public.quiz_attempts qa ON qa.quiz_id = q.quiz_id
      WHERE q.id = question_options.question_id
      AND qa.user_id = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "question_options_modify" ON public.question_options;
CREATE POLICY "question_options_insert" ON public.question_options
FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin() OR (
    public.is_instructor() AND EXISTS (
      SELECT 1
      FROM public.questions q
      JOIN public.quizzes qz ON qz.id = q.quiz_id
      JOIN public.lessons l ON l.id = qz.lesson_id
      JOIN public.modules m ON m.id = l.module_id
      WHERE q.id = question_options.question_id
      AND public.is_instructor_of_course(m.course_id)
    )
  )
);
CREATE POLICY "question_options_update" ON public.question_options
FOR UPDATE TO authenticated
USING (
  public.is_admin() OR (
    public.is_instructor() AND EXISTS (
      SELECT 1
      FROM public.questions q
      JOIN public.quizzes qz ON qz.id = q.quiz_id
      JOIN public.lessons l ON l.id = qz.lesson_id
      JOIN public.modules m ON m.id = l.module_id
      WHERE q.id = question_options.question_id
      AND public.is_instructor_of_course(m.course_id)
    )
  )
)
WITH CHECK (
  public.is_admin() OR (
    public.is_instructor() AND EXISTS (
      SELECT 1
      FROM public.questions q
      JOIN public.quizzes qz ON qz.id = q.quiz_id
      JOIN public.lessons l ON l.id = qz.lesson_id
      JOIN public.modules m ON m.id = l.module_id
      WHERE q.id = question_options.question_id
      AND public.is_instructor_of_course(m.course_id)
    )
  )
);
CREATE POLICY "question_options_delete" ON public.question_options
FOR DELETE TO authenticated
USING (
  public.is_admin() OR (
    public.is_instructor() AND EXISTS (
      SELECT 1
      FROM public.questions q
      JOIN public.quizzes qz ON qz.id = q.quiz_id
      JOIN public.lessons l ON l.id = qz.lesson_id
      JOIN public.modules m ON m.id = l.module_id
      WHERE q.id = question_options.question_id
      AND public.is_instructor_of_course(m.course_id)
    )
  )
);

-- 3) Fix auth wrappers in existing policies flagged by linter
-- user_answers_update_policy
DROP POLICY IF EXISTS "user_answers_update_policy" ON public.user_answers;
CREATE POLICY "user_answers_update_policy" ON public.user_answers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_attempts qa
    WHERE qa.id = user_answers.attempt_id
    AND qa.user_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
    AND profiles.role = 'admin'::public.user_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quiz_attempts qa
    WHERE qa.id = user_answers.attempt_id
    AND qa.user_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
    AND profiles.role = 'admin'::public.user_role
  )
);

-- quiz_attempts_update_policy
DROP POLICY IF EXISTS "quiz_attempts_update_policy" ON public.quiz_attempts;
CREATE POLICY "quiz_attempts_update_policy" ON public.quiz_attempts
FOR UPDATE
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

-- lesson_progress policies: wrap auth.uid()
DROP POLICY IF EXISTS "lesson_progress_modify" ON public.lesson_progress;
CREATE POLICY "lesson_progress_modify" ON public.lesson_progress TO authenticated
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

DROP POLICY IF EXISTS "lesson_progress_select" ON public.lesson_progress;
CREATE POLICY "lesson_progress_select" ON public.lesson_progress
FOR SELECT TO authenticated
USING (
  (user_id = (SELECT auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
    AND profiles.role = ANY (ARRAY['admin'::public.user_role,'instructor'::public.user_role])
  )
);

-- activity_logs: drop duplicate permissive SELECT policy and keep the one with wrappers
DROP POLICY IF EXISTS "activity_logs_select" ON public.activity_logs;

-- 4) Drop duplicate indexes flagged by linter (safe to drop if exist)
DROP INDEX IF EXISTS public.idx_question_options_question_id_lookup;
DROP INDEX IF EXISTS public.idx_videos_lesson_id;
DROP INDEX IF EXISTS public.idx_activity_logs_created_at_desc;
DROP INDEX IF EXISTS public.test_activity_logs_created;

COMMIT;
