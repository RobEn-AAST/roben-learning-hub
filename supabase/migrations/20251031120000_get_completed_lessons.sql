-- Migration: create function to get completed lessons for a user in a course
-- Run this in your Postgres/Supabase database to create the helper function.

CREATE OR REPLACE FUNCTION public.get_completed_lessons_for_course(
  p_user_id uuid,
  p_course_id uuid
) RETURNS TABLE(lesson_id uuid) AS $$
  SELECT l.id
  FROM public.lessons l
  JOIN public.modules m ON l.module_id = m.id
  JOIN public.lesson_progress lp ON lp.lesson_id = l.id
  WHERE m.course_id = p_course_id
    AND lp.user_id = p_user_id
    AND lp.status = 'completed'
  ;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_completed_lessons_for_course(uuid, uuid) IS 'Returns lesson ids completed by a given user within a specific course';
