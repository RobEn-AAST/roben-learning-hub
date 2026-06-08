-- Update finalization to use passing_score percentage
CREATE OR REPLACE FUNCTION public.calculate_quiz_score_and_complete(
  p_attempt_id uuid,
  p_time_taken_seconds integer DEFAULT NULL
) RETURNS TABLE(
  earned_points integer,
  total_points integer,
  score numeric,
  passed boolean,
  attempt jsonb
) LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_earned integer;
  v_total integer;
  v_score numeric;
  v_passing_score integer;
  v_passed boolean;
  v_attempt_json jsonb;
BEGIN
  SELECT
    COALESCE(SUM(ua.points_earned), 0),
    COALESCE(SUM(q.points), 0)
  INTO v_earned, v_total
  FROM public.user_answers ua
  JOIN public.questions q ON q.id = ua.question_id
  WHERE ua.attempt_id = p_attempt_id;

  IF v_total > 0 THEN
    v_score := ROUND((v_earned::numeric / v_total::numeric) * 100, 2);
  ELSE
    v_score := 0;
  END IF;

  SELECT qz.passing_score INTO v_passing_score
  FROM public.quiz_attempts qa
  JOIN public.quizzes qz ON qz.id = qa.quiz_id
  WHERE qa.id = p_attempt_id;

  IF v_total > 0 THEN
    IF v_passing_score IS NULL OR v_passing_score <= 0 THEN
      -- fallback to strict mode if passing score not configured
      v_passed := (v_earned = v_total);
    ELSE
      v_passed := (v_score >= v_passing_score);
    END IF;
  ELSE
    v_passed := false;
  END IF;

  UPDATE public.quiz_attempts
  SET
    earned_points = v_earned,
    total_points = v_total,
    score = v_score,
    passed = v_passed,
    completed_at = now(),
    time_taken_seconds = p_time_taken_seconds,
    updated_at = now()
  WHERE id = p_attempt_id
  RETURNING row_to_json(public.quiz_attempts.*)::jsonb INTO v_attempt_json;

  RETURN QUERY SELECT v_earned, v_total, v_score, v_passed, v_attempt_json;
END;
$$;

ALTER FUNCTION public.calculate_quiz_score_and_complete(uuid, integer) OWNER TO postgres;
