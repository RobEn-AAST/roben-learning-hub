-- DEPRECATED: an updated version exists in 20251103091500_use_passing_score_in_finalization.sql
-- This file is intentionally a NO-OP to avoid duplicate function bodies.
DO $$ BEGIN
  RAISE NOTICE 'Skipping deprecated migration 20251031150000_calculate_quiz_score_and_complete.sql (no-op).';
END $$;
