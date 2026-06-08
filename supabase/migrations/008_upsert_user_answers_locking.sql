-- Make upsert_user_answers_and_update_attempt take a per-attempt advisory lock
-- This serializes concurrent upserts for the same attempt id to avoid
-- foreign-key races and contention on the user_answers unique index.
-- It uses pg_advisory_xact_lock so the lock is released automatically at
-- transaction end.

CREATE OR REPLACE FUNCTION public.upsert_user_answers_and_update_attempt(
  p_attempt_id uuid,
  p_answers jsonb
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_processed integer := 0;
  v_earned integer := 0;
  v_total integer := 0;
  v_lock_key bigint;
BEGIN
  -- Convert attempt uuid into a stable bigint key for advisory locking.
  -- We use the lower 8 bytes of the MD5 hash to produce a bigint.
  v_lock_key := ('x' || substr(md5(p_attempt_id::text), 1, 16))::bit(64)::bigint;

  -- Acquire a transaction-scoped advisory lock for this attempt. Any other
  -- concurrent call for the same attempt will block here until this
  -- transaction completes, preventing FK races and conflicting upserts.
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Ensure the attempt exists before inserting answers. This prevents
  -- foreign key violations when the client read was served from a stale
  -- replica while the primary hasn't committed the attempt yet.
  IF NOT EXISTS (SELECT 1 FROM public.quiz_attempts WHERE id = p_attempt_id) THEN
    RAISE EXCEPTION 'Attempt % not found', p_attempt_id;
  END IF;

  WITH rows AS (
    SELECT
      COALESCE(NULLIF(r->>'questionId',''), r->>'question_id')::uuid AS question_id,
      NULLIF(COALESCE(NULLIF(r->>'selectedOptionId',''), r->>'selected_option_id'), '')::uuid AS selected_option_id,
      NULLIF(COALESCE(NULLIF(r->>'textAnswer',''), r->>'text_answer'), '') AS text_answer,
      COALESCE(NULLIF(r->>'answeredAt',''), r->>'answered_at')::timestamptz AS answered_at
    FROM jsonb_array_elements(p_answers) r
  ),
  calc AS (
    SELECT
      rows.question_id,
      rows.selected_option_id,
      rows.text_answer,
      COALESCE(rows.answered_at, now()) AS answered_at,
      q.points AS question_points,
      CASE WHEN rows.selected_option_id IS NOT NULL AND co.is_correct IS TRUE THEN TRUE ELSE FALSE END AS is_correct_calc
    FROM rows
    LEFT JOIN public.questions q ON q.id = rows.question_id
    LEFT JOIN public.question_options co ON co.id = rows.selected_option_id
  ),
  upserted AS (
    INSERT INTO public.user_answers (attempt_id, question_id, selected_option_id, text_answer, is_correct, points_earned, answered_at)
    SELECT
      p_attempt_id AS attempt_id,
      question_id,
      selected_option_id,
      text_answer,
      is_correct_calc,
      CASE WHEN is_correct_calc THEN COALESCE(question_points, 0) ELSE 0 END AS points_earned,
      answered_at
    FROM calc
    ON CONFLICT (attempt_id, question_id) DO UPDATE
    SET
      selected_option_id = EXCLUDED.selected_option_id,
      text_answer = EXCLUDED.text_answer,
      is_correct = EXCLUDED.is_correct,
      points_earned = EXCLUDED.points_earned,
      answered_at = EXCLUDED.answered_at
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_processed FROM upserted;

  -- Recalculate aggregates for the attempt
  SELECT COALESCE(SUM(ua.points_earned),0), COALESCE(SUM(q.points),0)
  INTO v_earned, v_total
  FROM public.user_answers ua
  LEFT JOIN public.questions q ON q.id = ua.question_id
  WHERE ua.attempt_id = p_attempt_id;

  -- Update attempt aggregates (do not set completed_at here)
  UPDATE public.quiz_attempts
  SET
    earned_points = v_earned,
    total_points = v_total,
    score = CASE WHEN v_total > 0 THEN ROUND((v_earned::numeric / v_total::numeric) * 100, 2) ELSE 0 END,
    passed = CASE WHEN v_total > 0 THEN (v_earned = v_total) ELSE false END,
    updated_at = now()
  WHERE id = p_attempt_id;

  RETURN v_processed;
END;
$$;

ALTER FUNCTION public.upsert_user_answers_and_update_attempt(uuid, jsonb) OWNER TO postgres;
