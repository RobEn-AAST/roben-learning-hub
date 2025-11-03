-- Hotfix: speed up quiz question fetch by simplifying RLS conditions
-- Context: /rest/v1/questions?select=... timed out with code 57014 (statement timeout)
-- Root cause: RLS policies evaluated expensive helper functions and multi-join OR branches
-- Solution: require an active quiz_attempt for authenticated users and remove the
--           "published question" branch from questions/question_options SELECT policies.

BEGIN;

-- Questions: replace the access policy with a leaner version
DROP POLICY IF EXISTS "questions_access" ON public.questions;
DROP POLICY IF EXISTS "questions_quiz_attempt_access" ON public.questions;

CREATE POLICY "questions_quiz_attempt_access"
ON public.questions
FOR SELECT
USING (
  -- Admins can see everything
  public.is_admin()
  OR
  -- Instructors can see questions for courses they teach (kept; rarely hit in student flow)
  (
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
  OR
  -- Authenticated users can read only if they have an attempt for that quiz
  (
    (SELECT auth.role()) = 'authenticated'
    AND EXISTS (
      SELECT 1
      FROM public.quiz_attempts qa
      WHERE qa.quiz_id = questions.quiz_id
      AND qa.user_id = (SELECT auth.uid())
    )
  )
);

-- Question options: drop prior access policy, add attempt-gated version
DROP POLICY IF EXISTS "question_options_access" ON public.question_options;
DROP POLICY IF EXISTS "question_options_quiz_attempt_access" ON public.question_options;

CREATE POLICY "question_options_quiz_attempt_access"
ON public.question_options
FOR SELECT
USING (
  public.is_admin()
  OR
  (
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
  OR
  (
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

-- Optional: ensure the two most-used indexes exist (harmless if already there)
CREATE INDEX IF NOT EXISTS idx_questions_quiz_position ON public.questions (quiz_id, position);
CREATE INDEX IF NOT EXISTS idx_question_options_question_position ON public.question_options (question_id, position);

COMMIT;