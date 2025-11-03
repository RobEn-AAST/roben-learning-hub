-- Restart (reset) a user's quiz attempt for a given quiz by reusing the same attempt id
-- Deletes previous answers, resets aggregates, and marks the attempt as open again
-- SECURITY DEFINER with per-(user,quiz) advisory lock to avoid races

CREATE OR REPLACE FUNCTION public.restart_quiz_attempt(p_quiz_id uuid)
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

  -- lock (user,quiz)
  v_lock_key := ('x' || substr(md5(v_user::text || ':' || p_quiz_id::text), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- pick an attempt if any (prefer the earliest open, else latest completed)
  SELECT * INTO v_attempt
  FROM public.quiz_attempts
  WHERE user_id = v_user AND quiz_id = p_quiz_id
  ORDER BY (completed_at IS NULL) DESC, started_at ASC NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    -- no attempt exists, create one
    INSERT INTO public.quiz_attempts (user_id, quiz_id, started_at)
    VALUES (v_user, p_quiz_id, now())
    RETURNING * INTO v_attempt;
    RETURN v_attempt;
  END IF;

  -- clear answers for this attempt
  DELETE FROM public.user_answers WHERE attempt_id = v_attempt.id;

  -- reset attempt aggregates and reopen it
  UPDATE public.quiz_attempts
  SET earned_points = 0,
      total_points = 0,
      score = 0,
      passed = false,
      completed_at = NULL,
      started_at = now(),
      updated_at = now()
  WHERE id = v_attempt.id
  RETURNING * INTO v_attempt;

  RETURN v_attempt;
END;
$$;

ALTER FUNCTION public.restart_quiz_attempt(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.restart_quiz_attempt(uuid) TO authenticated;
