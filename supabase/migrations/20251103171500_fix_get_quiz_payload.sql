-- Fix get_quiz_payload: remove outer ORDER BY that caused 42803 and keep ordering inside jsonb_agg
BEGIN;

CREATE OR REPLACE FUNCTION public.get_quiz_payload(p_quiz_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := (SELECT auth.uid());
  v_has_attempt boolean;
  v_result jsonb;
BEGIN
  IF v_user IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.quiz_attempts qa
    WHERE qa.quiz_id = p_quiz_id AND qa.user_id = v_user
  ) INTO v_has_attempt;

  IF NOT v_has_attempt THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT jsonb_agg(
           jsonb_build_object(
             'id', q.id,
             'content', q.content,
             'type', q.type,
             'points', q.points,
             'position', q.position,
             'question_options', (
               SELECT jsonb_agg(
                        jsonb_build_object(
                          'id', o.id,
                          'content', o.content,
                          'position', o.position
                        )
                        ORDER BY o.position
                      )
               FROM public.question_options o
               WHERE o.question_id = q.id
             )
           )
           ORDER BY q.position
         )
  INTO v_result
  FROM public.questions q
  WHERE q.quiz_id = p_quiz_id;

  RETURN coalesce(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_quiz_payload(uuid) TO authenticated;

COMMIT;