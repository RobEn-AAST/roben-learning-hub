-- Deduplicate existing quiz attempts and user answers, then (re)enforce uniqueness
-- Safe to run multiple times. Uses ctid-based deletes/updates to avoid depending on id columns.

BEGIN;

-- 1) Deduplicate user_answers on (attempt_id, question_id): keep the most recent answered_at, delete others
WITH ranked AS (
  SELECT ctid,
         attempt_id,
         question_id,
         ROW_NUMBER() OVER (
           PARTITION BY attempt_id, question_id
           ORDER BY answered_at DESC NULLS LAST, ctid DESC
         ) AS rn
  FROM public.user_answers
)
DELETE FROM public.user_answers ua
USING ranked r
WHERE ua.ctid = r.ctid
  AND r.rn > 1;

-- 2) Close duplicate open attempts: for each (user_id, quiz_id), keep the earliest started open attempt, mark others completed
WITH ranked AS (
  SELECT ctid,
         id,
         user_id,
         quiz_id,
         started_at,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, quiz_id
           ORDER BY started_at ASC NULLS LAST, ctid ASC
         ) AS rn
  FROM public.quiz_attempts
  WHERE completed_at IS NULL
)
UPDATE public.quiz_attempts qa
SET completed_at = now()
FROM ranked r
WHERE qa.ctid = r.ctid
  AND r.rn > 1;

-- 3) Ensure unique partial index for open attempts exists
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

-- 4) Ensure unique constraint on user_answers (attempt_id, question_id) exists
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

COMMIT;
