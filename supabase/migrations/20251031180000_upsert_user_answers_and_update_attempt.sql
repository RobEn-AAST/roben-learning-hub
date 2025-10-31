-- Upsert a batch of user answers and update attempt aggregates in one DB transaction.
-- p_answers should be a JSON array of objects with keys:
-- { questionId: uuid, selectedOptionId: uuid|null, textAnswer: text|null, answeredAt: timestamptz|null }

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
BEGIN
  -- Insert or update answers from the JSON array
  WITH rows AS (
    SELECT
      (r->>'questionId')::uuid AS question_id,
      NULLIF(r->>'selectedOptionId','')::uuid AS selected_option_id,
      NULLIF(r->>'textAnswer','') AS text_answer,
      (r->>'answeredAt')::timestamptz AS answered_at
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
