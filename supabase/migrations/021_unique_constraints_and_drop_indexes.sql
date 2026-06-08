-- ============================================
-- STEP 2: Add unique constraints + drop redundant indexes
-- This removes duplicate rows (if any) then adds protection.
-- ============================================

-- Deduplicate lesson_progress (keeps the newest row per user+lesson)
DELETE FROM lesson_progress a
  USING lesson_progress b
  WHERE a.id < b.id
    AND a.user_id = b.user_id
    AND a.lesson_id = b.lesson_id;

-- Prevent future duplicate progress records
CREATE UNIQUE INDEX IF NOT EXISTS lesson_progress_user_lesson_unique
  ON lesson_progress (user_id, lesson_id);

-- Deduplicate course_enrollments (keeps the newest row per user+course)
DELETE FROM course_enrollments a
  USING course_enrollments b
  WHERE a.id < b.id
    AND a.user_id = b.user_id
    AND a.course_id = b.course_id;

-- Prevent future duplicate enrollment records
CREATE UNIQUE INDEX IF NOT EXISTS course_enrollments_user_course_unique
  ON course_enrollments (user_id, course_id);

-- Drop redundant duplicate indexes (exact copies of existing ones)
DROP INDEX IF EXISTS idx_activity_logs_created_at_desc;
DROP INDEX IF EXISTS test_activity_logs_created;
DROP INDEX IF EXISTS idx_videos_lesson;
DROP INDEX IF EXISTS idx_question_options_question_id_lookup;
DROP INDEX IF EXISTS idx_enrollments_user_course;
