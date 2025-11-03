-- Clean up legacy quiz functions no longer in use
-- This migration removes the older calculate_quiz_score function,
-- superseded by calculate_quiz_score_and_complete which finalizes attempts atomically.

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'calculate_quiz_score'
      AND pg_catalog.pg_get_function_identity_arguments(p.oid) = 'uuid'
  ) THEN
    EXECUTE 'DROP FUNCTION public.calculate_quiz_score(uuid)';
  END IF;
END $$;
