-- Landing page: 1 RPC call instead of 6 sequential queries
-- Replaces: courses, enrollments, instructors, admins, stats queries
-- Apply via: Supabase Dashboard → SQL Editor → Paste → Run

CREATE OR REPLACE FUNCTION get_landing_data(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'courses', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', c.id,
        'title', c.title,
        'description', c.description,
        'cover_image', c.cover_image,
        'created_at', c.created_at
      ) ORDER BY c.created_at DESC)
      FROM courses c
      WHERE c.status = 'published'
      LIMIT CASE WHEN p_user_id IS NULL THEN 6 ELSE NULL END),
      '[]'::jsonb
    ),
    'enrolled_courses', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', ec.id,
        'title', ec.title,
        'description', ec.description,
        'cover_image', ec.cover_image,
        'created_at', ec.created_at
      ) ORDER BY ce.enrolled_at DESC)
      FROM course_enrollments ce
      JOIN courses ec ON ec.id = ce.course_id
      WHERE ce.user_id = p_user_id
      LIMIT 6),
      '[]'::jsonb
    ),
    'instructors', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', p.id,
        'first_name', p.first_name,
        'last_name', p.last_name,
        'email', p.email,
        'avatar_url', p.avatar_url,
        'bio', p.bio
      ) ORDER BY p.first_name)
      FROM profiles p
      WHERE p.role = 'instructor'
      LIMIT 6),
      '[]'::jsonb
    ),
    'admins', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', p.id,
        'first_name', p.first_name,
        'last_name', p.last_name,
        'email', p.email,
        'avatar_url', p.avatar_url,
        'bio', p.bio
      ) ORDER BY p.first_name)
      FROM profiles p
      WHERE p.role = 'admin'
      LIMIT 3),
      '[]'::jsonb
    ),
    'stats', jsonb_build_object(
      'total_courses', (SELECT COUNT(*) FROM courses WHERE status = 'published'),
      'total_enrollments', (SELECT COUNT(*) FROM course_enrollments),
      'total_lessons', (SELECT COUNT(*) FROM lessons)
    ),
    'is_authenticated', (p_user_id IS NOT NULL)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
