-- ============================================
-- FIX: get_course_detail RPC (v3 - fixed parens)
-- Run this on BOTH local and production DB
-- ============================================

CREATE OR REPLACE FUNCTION public.get_course_detail(
  p_course_id uuid,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_course record;
  v_instructor jsonb;
  v_enrollment_count bigint;
  v_total_lessons int;
  v_enrollment jsonb;
  v_progress jsonb;
  v_completed_ids jsonb;
  v_modules jsonb;
BEGIN
  -- 1. Get course (must be published)
  SELECT id, title, description INTO v_course
    FROM courses WHERE id = p_course_id AND status = 'published';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Course not found');
  END IF;

  -- 2. Get modules with lessons using a clean subquery approach
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'title', m.title,
      'description', m.description,
      'position', m.position,
      'order_index', m.position,
      'lessons', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'id', l.id,
            'title', l.title,
            'lesson_type', l.lesson_type,
            'position', l.position,
            'order_index', l.position,
            'description', '',
            'content_type', l.lesson_type,
            'content_url', CASE
              WHEN l.lesson_type = 'video' THEN COALESCE(
                (SELECT vid.url FROM videos vid WHERE vid.lesson_id = l.id LIMIT 1), '')
              ELSE ''
            END,
            'duration', CASE
              WHEN l.lesson_type = 'video' THEN COALESCE(
                (SELECT CEIL(vid.duration_seconds / 60.0)::int FROM videos vid WHERE vid.lesson_id = l.id LIMIT 1), 0)
              ELSE 0
            END,
            'is_preview', false,
            'articleContent', CASE
              WHEN l.lesson_type = 'article' THEN
                (SELECT art.content FROM articles art WHERE art.lesson_id = l.id LIMIT 1)
              ELSE NULL
            END,
            'quizId', CASE
              WHEN l.lesson_type = 'quiz' THEN
                (SELECT qz.id FROM quizzes qz WHERE qz.lesson_id = l.id LIMIT 1)
              ELSE NULL
            END,
            'projectTitle', CASE
              WHEN l.lesson_type = 'project' THEN
                (SELECT proj.title FROM projects proj WHERE proj.lesson_id = l.id LIMIT 1)
              ELSE NULL
            END,
            'projectDescription', CASE
              WHEN l.lesson_type = 'project' THEN
                (SELECT proj.description FROM projects proj WHERE proj.lesson_id = l.id LIMIT 1)
              ELSE NULL
            END,
            'projectInstructions', CASE
              WHEN l.lesson_type = 'project' THEN
                (SELECT proj.submission_instructions FROM projects proj WHERE proj.lesson_id = l.id LIMIT 1)
              ELSE NULL
            END,
            'projectPlatform', CASE
              WHEN l.lesson_type = 'project' THEN
                (SELECT proj.submission_platform FROM projects proj WHERE proj.lesson_id = l.id LIMIT 1)
              ELSE NULL
            END
          ) ORDER BY l.position
        ), '[]'::jsonb)
        FROM lessons l
        WHERE l.module_id = m.id AND l.status != 'hidden'
      )
    ) ORDER BY m.position
  ), '[]'::jsonb)
  INTO v_modules
  FROM modules m
  WHERE m.course_id = p_course_id;

  -- 3. Get instructor (from first visible lesson)
  SELECT jsonb_build_object(
    'id', p.id, 'first_name', p.first_name, 'last_name', p.last_name,
    'avatar_url', p.avatar_url, 'bio', p.bio
  ) INTO v_instructor
  FROM profiles p
  WHERE p.id = (
    SELECT l.instructor_id
    FROM lessons l JOIN modules m ON m.id = l.module_id
    WHERE m.course_id = p_course_id AND l.status != 'hidden'
    ORDER BY m.position, l.position LIMIT 1
  );

  -- 4. Enrollment count
  SELECT COUNT(*) INTO v_enrollment_count
    FROM course_enrollments WHERE course_id = p_course_id;

  -- 5. If user provided, check enrollment and compute progress
  IF p_user_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'id', e.id, 'enrolled_at', e.enrolled_at, 'role', e.role
    ) INTO v_enrollment
    FROM course_enrollments e
    WHERE e.course_id = p_course_id AND e.user_id = p_user_id
    LIMIT 1;

    IF v_enrollment IS NOT NULL THEN
      -- Count total visible lessons
      SELECT COUNT(*)::int INTO v_total_lessons
        FROM lessons l JOIN modules m ON m.id = l.module_id
        WHERE m.course_id = p_course_id AND l.status != 'hidden';

      -- Count completed lessons
      SELECT jsonb_build_object(
        'completedLessons', COUNT(lp.lesson_id)::int,
        'totalLessons', v_total_lessons,
        'percentage', CASE
          WHEN v_total_lessons > 0 THEN LEAST(100, ROUND(COUNT(lp.lesson_id)::numeric / v_total_lessons::numeric * 100))
          ELSE 0
        END
      ) INTO v_progress
      FROM lesson_progress lp
      WHERE lp.user_id = p_user_id
        AND lp.status = 'completed'
        AND lp.lesson_id IN (
          SELECT l.id FROM lessons l JOIN modules m ON m.id = l.module_id
          WHERE m.course_id = p_course_id AND l.status != 'hidden'
        );

      -- Get completed lesson IDs
      SELECT COALESCE(jsonb_agg(lp.lesson_id), '[]'::jsonb) INTO v_completed_ids
        FROM lesson_progress lp
        WHERE lp.user_id = p_user_id
          AND lp.status = 'completed'
          AND lp.lesson_id IN (
            SELECT l.id FROM lessons l JOIN modules m ON m.id = l.module_id
            WHERE m.course_id = p_course_id AND l.status != 'hidden'
          );
    END IF;
  END IF;

  -- 6. Build final response
  RETURN jsonb_build_object(
    'course', jsonb_build_object('id', v_course.id, 'title', v_course.title, 'description', v_course.description),
    'modules', COALESCE(v_modules, '[]'::jsonb),
    'instructor', COALESCE(v_instructor, 'null'::jsonb),
    'stats', jsonb_build_object(
      'enrollmentCount', v_enrollment_count,
      'moduleCount', COALESCE(jsonb_array_length(COALESCE(v_modules, '[]'::jsonb)), 0),
      'lessonCount', COALESCE((SELECT SUM(jsonb_array_length(COALESCE(elem->'lessons', '[]'::jsonb))) FROM jsonb_array_elements(COALESCE(v_modules, '[]'::jsonb)) elem), 0)
    ),
    'isEnrolled', v_enrollment IS NOT NULL,
    'enrollment', COALESCE(v_enrollment, 'null'::jsonb),
    'progress', COALESCE(v_progress, 'null'::jsonb),
    'completedLessonIds', COALESCE(v_completed_ids, '[]'::jsonb)
  );
END;
$$;
