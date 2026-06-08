-- Add UPDATE policy for user_answers to support upserts
-- This allows users to update their own answers during quiz attempts

DROP POLICY IF EXISTS "user_answers_update_policy" ON public.user_answers;

CREATE POLICY "user_answers_update_policy" 
ON public.user_answers 
FOR UPDATE 
USING (
  -- User owns the quiz attempt
  EXISTS (
    SELECT 1 FROM public.quiz_attempts qa
    WHERE qa.id = user_answers.attempt_id
    AND qa.user_id = auth.uid()
  )
  OR
  -- User is an admin
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  -- User owns the quiz attempt
  EXISTS (
    SELECT 1 FROM public.quiz_attempts qa
    WHERE qa.id = user_answers.attempt_id
    AND qa.user_id = auth.uid()
  )
  OR
  -- User is an admin
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
