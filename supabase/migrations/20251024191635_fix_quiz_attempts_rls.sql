-- Fix quiz_attempts UPDATE policy to allow marking as completed
-- The issue: current policy only allows updates when completed_at IS NULL
-- but we need to SET completed_at when completing the quiz

-- Drop the old policy
DROP POLICY IF EXISTS "quiz_attempts_update_policy" ON "public"."quiz_attempts";

-- Create new policy that allows:
-- 1. Users to update their own incomplete attempts
-- 2. Users to mark their own attempts as complete (set completed_at)
-- 3. Admins to update any attempt
CREATE POLICY "quiz_attempts_update_policy" ON "public"."quiz_attempts" 
FOR UPDATE 
USING (
  -- User owns the attempt OR is admin
  (user_id = auth.uid()) 
  OR 
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'::public.user_role
  ))
)
WITH CHECK (
  -- User owns the attempt OR is admin
  (user_id = auth.uid()) 
  OR 
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'::public.user_role
  ))
);
