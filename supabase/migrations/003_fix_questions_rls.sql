-- Fix questions RLS policy - allow students to view questions from quizzes they're taking
-- Current policy times out due to complex joins

-- Drop the old policy
DROP POLICY IF EXISTS "questions_comprehensive" ON "public"."questions";

-- Create new policy with better performance for students
CREATE POLICY "questions_access" ON "public"."questions" 
FOR SELECT
USING (
  -- Admins can see all questions
  public.is_admin()
  OR
  -- Instructors can see questions from their courses
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
  -- Students can see questions if they have an active attempt for that quiz
  -- OR if the quiz is from a published course
  (
    auth.role() = 'authenticated'
    AND (
      -- Has active quiz attempt
      EXISTS (
        SELECT 1
        FROM public.quiz_attempts qa
        WHERE qa.quiz_id = questions.quiz_id
        AND qa.user_id = auth.uid()
      )
      OR
      -- Question is from a published quiz
      public.is_question_published(questions.id)
    )
  )
  OR
  -- Anonymous users can see published questions
  (
    auth.role() = 'anon'
    AND public.is_question_published(questions.id)
  )
);

-- Create INSERT/UPDATE policy for instructors and admins
CREATE POLICY "questions_modify" ON "public"."questions" 
FOR ALL
USING (
  public.is_admin()
  OR
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
)
WITH CHECK (
  public.is_admin()
  OR
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
);

-- Also fix question_options RLS policy for better performance
DROP POLICY IF EXISTS "question_options_comprehensive" ON "public"."question_options";

CREATE POLICY "question_options_access" ON "public"."question_options" 
FOR SELECT
USING (
  -- Admins can see all options
  public.is_admin()
  OR
  -- Instructors can see options from their courses
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
  -- Students can see options if they have an active attempt OR if published
  (
    auth.role() = 'authenticated'
    AND (
      EXISTS (
        SELECT 1
        FROM public.questions q
        JOIN public.quiz_attempts qa ON qa.quiz_id = q.quiz_id
        WHERE q.id = question_options.question_id
        AND qa.user_id = auth.uid()
      )
      OR
      public.is_question_published(question_options.question_id)
    )
  )
  OR
  -- Anonymous users can see published options
  (
    auth.role() = 'anon'
    AND public.is_question_published(question_options.question_id)
  )
);

-- Create INSERT/UPDATE policy for question_options
CREATE POLICY "question_options_modify" ON "public"."question_options" 
FOR ALL
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
)
WITH CHECK (
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
);
