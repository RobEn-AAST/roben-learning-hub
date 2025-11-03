-- DEPRECATED: superseded by 20251031190000_upsert_user_answers_locking.sql
-- This file is intentionally a NO-OP to avoid duplicate function bodies.
DO $$ BEGIN
  RAISE NOTICE 'Skipping deprecated migration 20251031180000_upsert_user_answers_and_update_attempt.sql (no-op).';
END $$;
