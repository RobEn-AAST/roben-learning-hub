-- Add guards to prevent duplicate attempts and answers, and introduce ensure_quiz_attempt RPC
-- Idempotent and safe to run multiple times.

-- 1) Unique partial index: one open attempt per (user_id, quiz_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'uq_quiz_attempts_user_quiz_open'
  ) THEN
    CREATE UNIQUE INDEX uq_quiz_attempts_user_quiz_open
      ON public.quiz_attempts (user_id, quiz_id)
      WHERE completed_at IS NULL;
  END IF;
END$$;

-- 2) Unique constraint on user_answers: one answer per (attempt_id, question_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_user_answers_attempt_question'
      AND conrelid = 'public.user_answers'::regclass
  ) THEN
    ALTER TABLE public.user_answers
      ADD CONSTRAINT uq_user_answers_attempt_question UNIQUE (attempt_id, question_id);
  END IF;
END$$;

-- 3) ensure_quiz_attempt RPC: returns the existing open attempt or creates a new one under a short advisory lock
CREATE OR REPLACE FUNCTION public.ensure_quiz_attempt(p_quiz_id uuid)
RETURNS public.quiz_attempts
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_attempt public.quiz_attempts;
  v_lock_key bigint;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  -- lock on (user,quiz) to prevent concurrent double-creates
  v_lock_key := ('x' || substr(md5(v_user::text || ':' || p_quiz_id::text), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- existing open attempt?
  SELECT * INTO v_attempt
  FROM public.quiz_attempts
  WHERE user_id = v_user
    AND quiz_id = p_quiz_id
    AND completed_at IS NULL
  ORDER BY started_at ASC
  LIMIT 1;

  IF FOUND THEN
    RETURN v_attempt;
  END IF;

  -- create new
  INSERT INTO public.quiz_attempts (user_id, quiz_id, started_at)
  VALUES (v_user, p_quiz_id, now())
  RETURNING * INTO v_attempt;

  RETURN v_attempt;
END;
$$;

ALTER FUNCTION public.ensure_quiz_attempt(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.ensure_quiz_attempt(uuid) TO authenticated;
