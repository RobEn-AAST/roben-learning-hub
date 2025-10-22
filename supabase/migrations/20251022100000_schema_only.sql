


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."course_status" AS ENUM (
    'draft',
    'published',
    'archived'
);


ALTER TYPE "public"."course_status" OWNER TO "postgres";


CREATE TYPE "public"."enrollment_role" AS ENUM (
    'student',
    'instructor',
    'admin'
);


ALTER TYPE "public"."enrollment_role" OWNER TO "postgres";


CREATE TYPE "public"."lesson_type" AS ENUM (
    'article',
    'video',
    'quiz',
    'project',
    'other'
);


ALTER TYPE "public"."lesson_type" OWNER TO "postgres";


CREATE TYPE "public"."node_status" AS ENUM (
    'visible',
    'hidden'
);


ALTER TYPE "public"."node_status" OWNER TO "postgres";


CREATE TYPE "public"."progress_status" AS ENUM (
    'not_started',
    'in_progress',
    'completed'
);


ALTER TYPE "public"."progress_status" OWNER TO "postgres";


CREATE TYPE "public"."quiz_question_type" AS ENUM (
    'multiple_choice',
    'short_answer',
    'true_false'
);


ALTER TYPE "public"."quiz_question_type" OWNER TO "postgres";


CREATE TYPE "public"."submission_platform" AS ENUM (
    'github',
    'google_drive',
    'onedrive',
    'dropbox',
    'gitlab',
    'bitbucket',
    'other'
);


ALTER TYPE "public"."submission_platform" OWNER TO "postgres";


CREATE TYPE "public"."submission_status" AS ENUM (
    'submitted',
    'pending_review',
    'reviewed',
    'approved',
    'rejected',
    'resubmission_required'
);


ALTER TYPE "public"."submission_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'student',
    'instructor',
    'admin'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_instructor_to_course"("p_course_id" "uuid", "p_instructor_id" "uuid", "p_assigned_by" "uuid", "p_role" "text" DEFAULT 'instructor'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_assignment_id UUID;
BEGIN
  -- Verify the assigned_by user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = p_assigned_by 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can assign instructors. User % is not an admin.', p_assigned_by;
  END IF;

  -- Verify the instructor has the right role
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = p_instructor_id 
    AND role = 'instructor'
  ) THEN
    RAISE EXCEPTION 'User % does not have instructor role', p_instructor_id;
  END IF;

  -- Insert or update the assignment
  INSERT INTO public.course_instructors (course_id, instructor_id, assigned_by, role)
  VALUES (p_course_id, p_instructor_id, p_assigned_by, p_role)
  ON CONFLICT (course_id, instructor_id) 
  DO UPDATE SET 
    is_active = true,
    role = p_role,
    assigned_by = p_assigned_by,
    assigned_at = now(),
    updated_at = now()
  RETURNING id INTO v_assignment_id;

  RETURN v_assignment_id;
END;
$$;


ALTER FUNCTION "public"."assign_instructor_to_course"("p_course_id" "uuid", "p_instructor_id" "uuid", "p_assigned_by" "uuid", "p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_quiz_score"("p_attempt_id" "uuid") RETURNS TABLE("earned_points" integer, "total_points" integer, "score" numeric, "passed" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_earned integer;
  v_total integer;
  v_score numeric;
  v_passing_score integer;
  v_passed boolean;
BEGIN
  -- Calculate points
  SELECT 
    COALESCE(SUM(ua.points_earned), 0),
    COALESCE(SUM(q.points), 0)
  INTO v_earned, v_total
  FROM public.user_answers ua
  JOIN public.questions q ON q.id = ua.question_id
  WHERE ua.attempt_id = p_attempt_id;
  
  -- Calculate percentage score
  IF v_total > 0 THEN
    v_score := ROUND((v_earned::numeric / v_total::numeric) * 100, 2);
  ELSE
    v_score := 0;
  END IF;
  
  -- Check if passed
  SELECT qz.passing_score INTO v_passing_score
  FROM public.quiz_attempts qa
  JOIN public.quizzes qz ON qz.id = qa.quiz_id
  WHERE qa.id = p_attempt_id;
  
  v_passed := v_score >= COALESCE(v_passing_score, 0);
  
  -- Update the attempt record
  UPDATE public.quiz_attempts
  SET 
    earned_points = v_earned,
    total_points = v_total,
    score = v_score,
    passed = v_passed,
    updated_at = now()
  WHERE id = p_attempt_id;
  
  RETURN QUERY SELECT v_earned, v_total, v_score, v_passed;
END;
$$;


ALTER FUNCTION "public"."calculate_quiz_score"("p_attempt_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_access_course_content"("course_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN is_admin() 
    OR is_instructor_of_course(course_uuid)
    OR is_enrolled_in_course(course_uuid);
END;
$$;


ALTER FUNCTION "public"."can_access_course_content"("course_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_access_next_lesson"("p_current_lesson_id" "uuid", "p_user_id" "uuid") RETURNS TABLE("can_access" boolean, "reason" "text", "blocked_by_lesson_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_current_position integer;
  v_module_id uuid;
  v_previous_lesson_id uuid;
  v_previous_lesson_type lesson_type;
  v_previous_completed boolean;
  v_has_approved boolean;
BEGIN
  -- Get current lesson position and module
  SELECT position, module_id INTO v_current_position, v_module_id
  FROM public.lessons
  WHERE id = p_current_lesson_id;
  
  -- Get previous lesson in the same module
  SELECT id, lesson_type INTO v_previous_lesson_id, v_previous_lesson_type
  FROM public.lessons
  WHERE module_id = v_module_id
  AND position < v_current_position
  ORDER BY position DESC
  LIMIT 1;
  
  -- If there's no previous lesson, user can access this one
  IF v_previous_lesson_id IS NULL THEN
    RETURN QUERY SELECT true, 'First lesson in module'::text, NULL::uuid;
    RETURN;
  END IF;
  
  -- Check if previous lesson is completed
  SELECT EXISTS (
    SELECT 1 FROM public.lesson_progress
    WHERE lesson_id = v_previous_lesson_id
    AND user_id = p_user_id
    AND status = 'completed'
  ) INTO v_previous_completed;
  
  -- If previous lesson is not completed
  IF NOT v_previous_completed THEN
    RETURN QUERY SELECT false, 'Previous lesson must be completed first'::text, v_previous_lesson_id;
    RETURN;
  END IF;
  
  -- If previous lesson is a project, check for approved submission
  IF v_previous_lesson_type = 'project' THEN
    v_has_approved := has_approved_project_submission(v_previous_lesson_id, p_user_id);
    
    IF NOT v_has_approved THEN
      RETURN QUERY SELECT false, 'Previous project must be approved by instructor before proceeding'::text, v_previous_lesson_id;
      RETURN;
    END IF;
  END IF;
  
  -- All checks passed
  RETURN QUERY SELECT true, 'Can access lesson'::text, NULL::uuid;
  RETURN;
END;
$$;


ALTER FUNCTION "public"."can_access_next_lesson"("p_current_lesson_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_complete_lesson"("p_lesson_id" "uuid", "p_user_id" "uuid") RETURNS TABLE("can_complete" boolean, "reason" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_lesson_type lesson_type;
  v_has_approved boolean;
BEGIN
  -- Get lesson type
  SELECT lesson_type INTO v_lesson_type
  FROM public.lessons
  WHERE id = p_lesson_id;
  
  -- If lesson type is 'project', check for approved submission
  IF v_lesson_type = 'project' THEN
    v_has_approved := has_approved_project_submission(p_lesson_id, p_user_id);
    
    IF NOT v_has_approved THEN
      RETURN QUERY SELECT false, 'Project submission must be approved by instructor before completion'::text;
      RETURN;
    END IF;
  END IF;
  
  -- All checks passed
  RETURN QUERY SELECT true, 'Lesson can be completed'::text;
  RETURN;
END;
$$;


ALTER FUNCTION "public"."can_complete_lesson"("p_lesson_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_edit_course"("course_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN is_admin() 
    OR is_course_creator(course_uuid)
    OR is_instructor_of_course(course_uuid);
END;
$$;


ALTER FUNCTION "public"."can_edit_course"("course_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_enroll_in_course"("course_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check if course is published and user is not already enrolled
  RETURN EXISTS (
    SELECT 1 FROM courses 
    WHERE id = course_uuid 
    AND status = 'published'
  ) AND NOT EXISTS (
    SELECT 1 FROM course_enrollments 
    WHERE course_id = course_uuid 
    AND user_id = auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."can_enroll_in_course"("course_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_courses"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN is_admin() OR is_instructor();
END;
$$;


ALTER FUNCTION "public"."can_manage_courses"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_activity_logs"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    DELETE FROM activity_logs 
    WHERE created_at < NOW() - INTERVAL '14 days';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_activity_logs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_best_quiz_attempt"("p_quiz_id" "uuid", "p_user_id" "uuid") RETURNS TABLE("attempt_id" "uuid", "score" numeric, "passed" boolean, "completed_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qa.id as attempt_id,
    qa.score,
    qa.passed,
    qa.completed_at
  FROM public.quiz_attempts qa
  WHERE qa.quiz_id = p_quiz_id
  AND qa.user_id = p_user_id
  AND qa.completed_at IS NOT NULL
  ORDER BY qa.score DESC, qa.completed_at DESC
  LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_best_quiz_attempt"("p_quiz_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_course_analytics"() RETURNS TABLE("course_id" "uuid", "course_title" "text", "enrollment_count" bigint, "completion_rate" numeric, "active_students" bigint, "avg_progress" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH course_stats AS (
    -- Get enrollment counts
    SELECT 
      c.id as cid,
      c.title,
      COUNT(DISTINCT ce.user_id) as enrollments,
      COUNT(DISTINCT CASE 
        WHEN lp.completed_at IS NOT NULL 
        THEN ce.user_id 
      END) as completions,
      COUNT(DISTINCT CASE 
        WHEN lp.started_at > NOW() - INTERVAL '7 days' 
        THEN ce.user_id 
      END) as active_users
    FROM courses c
    LEFT JOIN course_enrollments ce ON c.id = ce.course_id
    LEFT JOIN modules m ON c.id = m.course_id
    LEFT JOIN lessons l ON m.id = l.module_id
    LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = ce.user_id
    WHERE c.status = 'published'
    GROUP BY c.id, c.title
  ),
  progress_stats AS (
    -- Calculate average progress per course
    SELECT 
      c.id as cid,
      AVG(
        CASE 
          WHEN total_lessons > 0 
          THEN (completed_lessons::numeric / total_lessons::numeric * 100)
          ELSE 0 
        END
      ) as avg_progress_pct
    FROM courses c
    LEFT JOIN LATERAL (
      SELECT 
        COUNT(DISTINCT l.id) as total_lessons,
        COUNT(DISTINCT CASE WHEN lp.completed_at IS NOT NULL THEN l.id END) as completed_lessons
      FROM modules m
      INNER JOIN lessons l ON m.id = l.module_id
      LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id
      WHERE m.course_id = c.id
    ) lesson_counts ON true
    WHERE c.status = 'published'
    GROUP BY c.id
  )
  SELECT 
    cs.cid,
    cs.title,
    cs.enrollments,
    CASE 
      WHEN cs.enrollments > 0 
      THEN ROUND((cs.completions::numeric / cs.enrollments::numeric * 100), 2)
      ELSE 0 
    END as completion_rate,
    cs.active_users,
    COALESCE(ROUND(ps.avg_progress_pct, 2), 0) as avg_progress
  FROM course_stats cs
  LEFT JOIN progress_stats ps ON cs.cid = ps.cid
  ORDER BY cs.enrollments DESC;
END;
$$;


ALTER FUNCTION "public"."get_course_analytics"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_course_analytics"() IS 'Optimized analytics function that replaces expensive nested SELECTs with efficient CTEs. 
   Returns course enrollment, completion rate, active students, and average progress.
   Expected 60% performance improvement over previous implementation.';



CREATE OR REPLACE FUNCTION "public"."get_course_id_from_question"("question_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
    course_id UUID;
BEGIN
    SELECT c.id INTO course_id
    FROM questions q
    JOIN quizzes qz ON qz.id = q.quiz_id
    JOIN lessons l ON l.id = qz.lesson_id
    JOIN modules m ON m.id = l.module_id
    JOIN courses c ON c.id = m.course_id
    WHERE q.id = question_id;
    
    RETURN course_id;
END;
$$;


ALTER FUNCTION "public"."get_course_id_from_question"("question_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_course_progress"("course_slug" "text", "user_uuid" "uuid") RETURNS TABLE("course_id" "uuid", "course_title" "text", "course_description" "text", "module_id" "uuid", "module_title" "text", "module_position" integer, "lesson_id" "uuid", "lesson_title" "text", "lesson_type" "text", "lesson_position" integer, "progress_status" "text", "progress_percentage" numeric, "completed_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as course_id,
    c.title as course_title,
    c.description as course_description,
    m.id as module_id,
    m.title as module_title,
    m.position as module_position,
    l.id as lesson_id,
    l.title as lesson_title,
    l.lesson_type::TEXT,
    l.position as lesson_position,
    COALESCE(lp.status::TEXT, 'not_started') as progress_status,
    COALESCE(lp.progress, 0) as progress_percentage,
    lp.completed_at
  FROM public.courses c
  JOIN public.modules m ON c.id = m.course_id
  JOIN public.lessons l ON m.id = l.module_id
  LEFT JOIN public.lesson_progress lp ON l.id = lp.lesson_id 
    AND lp.user_id = user_uuid
  WHERE c.slug = course_slug
    AND c.status = 'published'
    AND l.status = 'visible'
  ORDER BY m.position, l.position;
END;
$$;


ALTER FUNCTION "public"."get_course_progress"("course_slug" "text", "user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_courses_with_stats"("user_uuid" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "slug" "text", "title" "text", "description" "text", "status" "text", "cover_image" "text", "created_at" timestamp with time zone, "module_count" bigint, "lesson_count" bigint, "student_count" bigint, "is_enrolled" boolean, "enrolled_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.slug,
    c.title,
    c.description,
    c.status::TEXT,
    c.cover_image,
    c.created_at,
    COUNT(DISTINCT m.id) as module_count,
    COUNT(DISTINCT l.id) as lesson_count,
    COUNT(DISTINCT ce.user_id) FILTER (WHERE ce.role = 'student') as student_count,
    CASE 
      WHEN user_enrollment.user_id IS NOT NULL THEN true 
      ELSE false 
    END as is_enrolled,
    user_enrollment.enrolled_at
  FROM public.courses c
  LEFT JOIN public.modules m ON c.id = m.course_id
  LEFT JOIN public.lessons l ON m.id = l.module_id
  LEFT JOIN public.course_enrollments ce ON c.id = ce.course_id
  LEFT JOIN public.course_enrollments user_enrollment ON c.id = user_enrollment.course_id 
    AND user_enrollment.user_id = user_uuid
  WHERE c.status = 'published'
  GROUP BY c.id, c.slug, c.title, c.description, c.status, c.cover_image, c.created_at,
           user_enrollment.user_id, user_enrollment.enrolled_at
  ORDER BY c.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_courses_with_stats"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_enrollment_status"("course_uuid" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN (
    SELECT role::text FROM course_enrollments 
    WHERE course_id = course_uuid 
    AND user_id = auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."get_enrollment_status"("course_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_latest_quiz_attempt"("p_quiz_id" "uuid", "p_user_id" "uuid") RETURNS TABLE("attempt_id" "uuid", "score" numeric, "passed" boolean, "completed_at" timestamp with time zone, "started_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qa.id as attempt_id,
    qa.score,
    qa.passed,
    qa.completed_at,
    qa.started_at
  FROM public.quiz_attempts qa
  WHERE qa.quiz_id = p_quiz_id
  AND qa.user_id = p_user_id
  ORDER BY qa.started_at DESC
  LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_latest_quiz_attempt"("p_quiz_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_project_submission_stats"("p_project_id" "uuid") RETURNS TABLE("total_submissions" bigint, "submitted_count" bigint, "pending_review_count" bigint, "reviewed_count" bigint, "approved_count" bigint, "rejected_count" bigint, "average_grade" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_submissions,
    COUNT(*) FILTER (WHERE status = 'submitted')::bigint as submitted_count,
    COUNT(*) FILTER (WHERE status = 'pending_review')::bigint as pending_review_count,
    COUNT(*) FILTER (WHERE status = 'reviewed')::bigint as reviewed_count,
    COUNT(*) FILTER (WHERE status = 'approved')::bigint as approved_count,
    COUNT(*) FILTER (WHERE status = 'rejected')::bigint as rejected_count,
    ROUND(AVG(grade), 2) as average_grade
  FROM public.project_submissions
  WHERE project_id = p_project_id;
END;
$$;


ALTER FUNCTION "public"."get_project_submission_stats"("p_project_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_quiz_statistics"("p_quiz_id" "uuid") RETURNS TABLE("total_attempts" bigint, "unique_students" bigint, "average_score" numeric, "pass_rate" numeric, "highest_score" numeric, "lowest_score" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_attempts,
    COUNT(DISTINCT user_id)::bigint as unique_students,
    ROUND(AVG(score), 2) as average_score,
    ROUND((COUNT(*) FILTER (WHERE passed = true)::numeric / NULLIF(COUNT(*), 0)) * 100, 2) as pass_rate,
    MAX(score) as highest_score,
    MIN(score) as lowest_score
  FROM public.quiz_attempts
  WHERE quiz_id = p_quiz_id
  AND completed_at IS NOT NULL;
END;
$$;


ALTER FUNCTION "public"."get_quiz_statistics"("p_quiz_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_project_submission"("p_project_id" "uuid", "p_user_id" "uuid") RETURNS TABLE("id" "uuid", "submission_link" "text", "submission_platform" "public"."submission_platform", "status" "public"."submission_status", "submitted_at" timestamp with time zone, "reviewed_at" timestamp with time zone, "feedback" "text", "grade" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.id,
    ps.submission_link,
    ps.submission_platform,
    ps.status,
    ps.submitted_at,
    ps.reviewed_at,
    ps.feedback,
    ps.grade
  FROM public.project_submissions ps
  WHERE ps.project_id = p_project_id
  AND ps.user_id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."get_user_project_submission"("p_project_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN (
    SELECT role FROM profiles 
    WHERE id = auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."get_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    'student',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_approved_project_submission"("p_lesson_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_project_id uuid;
  v_has_approved_submission boolean;
BEGIN
  -- Get the project ID for this lesson
  SELECT id INTO v_project_id
  FROM public.projects
  WHERE lesson_id = p_lesson_id;
  
  -- If no project exists for this lesson, return true (no requirement)
  IF v_project_id IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check if user has an approved submission
  SELECT EXISTS (
    SELECT 1 FROM public.project_submissions
    WHERE project_id = v_project_id
    AND user_id = p_user_id
    AND status = 'approved'
  ) INTO v_has_approved_submission;
  
  RETURN v_has_approved_submission;
END;
$$;


ALTER FUNCTION "public"."has_approved_project_submission"("p_lesson_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("user_role" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = user_role
  );
END;
$$;


ALTER FUNCTION "public"."has_role"("user_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_anonymous"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN auth.uid() IS NULL;
END;
$$;


ALTER FUNCTION "public"."is_anonymous"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_authenticated"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$;


ALTER FUNCTION "public"."is_authenticated"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_course_creator"("course_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM courses 
    WHERE id = course_uuid AND created_by = auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."is_course_creator"("course_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_enrolled_in_course"("course_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM course_enrollments 
    WHERE course_id = course_uuid 
    AND user_id = auth.uid()
    AND role = 'student'  -- Ensure they're enrolled as a student
  );
END;
$$;


ALTER FUNCTION "public"."is_enrolled_in_course"("course_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_instructor"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'instructor'
  );
END;
$$;


ALTER FUNCTION "public"."is_instructor"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_instructor_of_course"("course_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM course_instructors ci
    JOIN courses c ON c.id = ci.course_id
    WHERE ci.course_id = course_uuid 
    AND ci.instructor_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM courses 
    WHERE id = course_uuid AND created_by = auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."is_instructor_of_course"("course_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_question_published"("question_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
    is_published BOOLEAN DEFAULT FALSE;
BEGIN
    SELECT (c.status = 'published') INTO is_published
    FROM questions q
    JOIN quizzes qz ON qz.id = q.quiz_id
    JOIN lessons l ON l.id = qz.lesson_id
    JOIN modules m ON m.id = l.module_id
    JOIN courses c ON c.id = m.course_id
    WHERE q.id = question_id;
    
    RETURN COALESCE(is_published, FALSE);
END;
$$;


ALTER FUNCTION "public"."is_question_published"("question_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_student"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'student'
  );
END;
$$;


ALTER FUNCTION "public"."is_student"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."owns_profile"("profile_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN auth.uid() = profile_uuid;
END;
$$;


ALTER FUNCTION "public"."owns_profile"("profile_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_instructor_from_course"("p_course_id" "uuid", "p_instructor_id" "uuid", "p_removed_by" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Verify the removed_by user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = p_removed_by 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can remove instructors. User % is not an admin.', p_removed_by;
  END IF;

  UPDATE public.course_instructors 
  SET is_active = false, updated_at = now()
  WHERE course_id = p_course_id AND instructor_id = p_instructor_id;
  
  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."remove_instructor_from_course"("p_course_id" "uuid", "p_instructor_id" "uuid", "p_removed_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_course_instructors_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_course_instructors_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_project_submission_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_project_submission_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_quiz_attempt_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_quiz_attempt_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_profile_exists"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."user_profile_exists"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_course_instructor_assignment"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Check if instructor has 'instructor' role
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = NEW.instructor_id 
    AND role = 'instructor'
  ) THEN
    RAISE EXCEPTION 'User with ID % does not have instructor role', NEW.instructor_id;
  END IF;

  -- Check if assigned_by has 'admin' role (if not null)
  IF NEW.assigned_by IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = NEW.assigned_by 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can assign instructors. User % is not an admin.', NEW.assigned_by;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_course_instructor_assignment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_lesson_completion"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_lesson_type lesson_type;
  v_can_complete boolean;
  v_reason text;
BEGIN
  -- Only validate when marking as completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Check if lesson can be completed
    SELECT cc.can_complete, cc.reason INTO v_can_complete, v_reason
    FROM can_complete_lesson(NEW.lesson_id, NEW.user_id) cc;
    
    IF NOT v_can_complete THEN
      RAISE EXCEPTION 'Cannot complete lesson: %', v_reason;
    END IF;
    
    -- Set completed_at timestamp
    NEW.completed_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_lesson_completion"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."activity_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "user_name" character varying(255) NOT NULL,
    "action" character varying(50) NOT NULL,
    "table_name" character varying(100) NOT NULL,
    "record_id" "uuid",
    "record_name" character varying(255),
    "description" "text" NOT NULL,
    "old_values" "text",
    "new_values" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."activity_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."articles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lesson_id" "uuid",
    "title" "text",
    "content" "text",
    "summary" "text",
    "reading_time_minutes" integer,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."articles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_enrollments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid",
    "user_id" "uuid",
    "role" "public"."enrollment_role" DEFAULT 'student'::"public"."enrollment_role",
    "enrolled_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."course_enrollments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_instructors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "instructor_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'instructor'::"text",
    "assigned_at" timestamp with time zone DEFAULT "now"(),
    "assigned_by" "uuid",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "course_instructors_role_check" CHECK (("role" = 'instructor'::"text"))
);


ALTER TABLE "public"."course_instructors" OWNER TO "postgres";


COMMENT ON TABLE "public"."course_instructors" IS 'Many-to-many relationship between courses and instructor profiles with admin-only assignment validation';



COMMENT ON COLUMN "public"."course_instructors"."course_id" IS 'Reference to the course';



COMMENT ON COLUMN "public"."course_instructors"."instructor_id" IS 'Reference to the instructor profile (validated by trigger to have instructor role)';



COMMENT ON COLUMN "public"."course_instructors"."role" IS 'Instructor role within this course (instructor only)';



COMMENT ON COLUMN "public"."course_instructors"."assigned_at" IS 'When the instructor was assigned to this course';



COMMENT ON COLUMN "public"."course_instructors"."assigned_by" IS 'Who assigned this instructor (validated by trigger to be admin)';



COMMENT ON COLUMN "public"."course_instructors"."is_active" IS 'Whether this assignment is currently active';



CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "cover_image" "text",
    "status" "public"."course_status" DEFAULT 'draft'::"public"."course_status" NOT NULL,
    "metadata" "jsonb",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lesson_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lesson_id" "uuid",
    "user_id" "uuid",
    "status" "public"."progress_status" DEFAULT 'not_started'::"public"."progress_status",
    "progress" numeric DEFAULT 0,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."lesson_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lessons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "lesson_type" "public"."lesson_type" NOT NULL,
    "position" integer DEFAULT 0,
    "status" "public"."node_status" DEFAULT 'visible'::"public"."node_status" NOT NULL,
    "instructor_id" "uuid",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lessons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "position" integer DEFAULT 0,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "email" "text",
    "avatar_url" "text",
    "bio" "text",
    "role" "public"."user_role" DEFAULT 'student'::"public"."user_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "submission_link" "text" NOT NULL,
    "submission_platform" "public"."submission_platform" NOT NULL,
    "status" "public"."submission_status" DEFAULT 'submitted'::"public"."submission_status" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"(),
    "reviewed_at" timestamp with time zone,
    "reviewed_by" "uuid",
    "feedback" "text",
    "grade" numeric(5,2),
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_grade" CHECK ((("grade" >= (0)::numeric) AND ("grade" <= (100)::numeric))),
    CONSTRAINT "valid_submission_link" CHECK (("char_length"("submission_link") > 0))
);


ALTER TABLE "public"."project_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lesson_id" "uuid",
    "title" "text",
    "description" "text",
    "submission_instructions" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "submission_platform" "public"."submission_platform"
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."question_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid",
    "content" "text" NOT NULL,
    "is_correct" boolean DEFAULT false,
    "position" integer DEFAULT 0
);


ALTER TABLE "public"."question_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quiz_id" "uuid",
    "type" "public"."quiz_question_type" DEFAULT 'multiple_choice'::"public"."quiz_question_type",
    "content" "text" NOT NULL,
    "points" integer DEFAULT 1,
    "position" integer DEFAULT 0
);


ALTER TABLE "public"."questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "score" numeric(5,2),
    "total_points" integer,
    "earned_points" integer,
    "passed" boolean DEFAULT false,
    "time_taken_seconds" integer,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_points" CHECK ((("earned_points" >= 0) AND ("earned_points" <= "total_points"))),
    CONSTRAINT "valid_score" CHECK ((("score" >= (0)::numeric) AND ("score" <= (100)::numeric)))
);


ALTER TABLE "public"."quiz_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quizzes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lesson_id" "uuid",
    "title" "text",
    "description" "text",
    "passing_score" integer DEFAULT 0,
    "time_limit_minutes" integer,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."quizzes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "attempt_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "selected_option_id" "uuid",
    "text_answer" "text",
    "is_correct" boolean,
    "points_earned" integer DEFAULT 0,
    "answered_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."video_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "video_id" "uuid",
    "question" "text" NOT NULL,
    "timestamp_seconds" double precision,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."video_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."videos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lesson_id" "uuid",
    "provider" "text",
    "provider_video_id" "text",
    "url" "text",
    "duration_seconds" integer,
    "transcript" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."videos" OWNER TO "postgres";


ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_lesson_id_key" UNIQUE ("lesson_id");



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_instructors"
    ADD CONSTRAINT "course_instructors_course_id_instructor_id_key" UNIQUE ("course_id", "instructor_id");



ALTER TABLE ONLY "public"."course_instructors"
    ADD CONSTRAINT "course_instructors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."lesson_progress"
    ADD CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_submissions"
    ADD CONSTRAINT "project_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_lesson_id_key" UNIQUE ("lesson_id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_options"
    ADD CONSTRAINT "question_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_lesson_id_key" UNIQUE ("lesson_id");



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_answers"
    ADD CONSTRAINT "user_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_answers"
    ADD CONSTRAINT "user_answers_unique_question_per_attempt" UNIQUE ("attempt_id", "question_id");



ALTER TABLE ONLY "public"."video_questions"
    ADD CONSTRAINT "video_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_lesson_id_key" UNIQUE ("lesson_id");



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_activity_logs_action" ON "public"."activity_logs" USING "btree" ("action");



CREATE INDEX "idx_activity_logs_action_created" ON "public"."activity_logs" USING "btree" ("action", "created_at" DESC);



CREATE INDEX "idx_activity_logs_action_table_created" ON "public"."activity_logs" USING "btree" ("action", "table_name", "created_at" DESC);



CREATE INDEX "idx_activity_logs_created_at" ON "public"."activity_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_activity_logs_created_at_desc" ON "public"."activity_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_activity_logs_table_created" ON "public"."activity_logs" USING "btree" ("table_name", "created_at" DESC);



CREATE INDEX "idx_activity_logs_table_name" ON "public"."activity_logs" USING "btree" ("table_name");



CREATE INDEX "idx_activity_logs_user_action" ON "public"."activity_logs" USING "btree" ("user_id", "action");



CREATE INDEX "idx_activity_logs_user_created_recent" ON "public"."activity_logs" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_activity_logs_user_id" ON "public"."activity_logs" USING "btree" ("user_id");



CREATE INDEX "idx_articles_lesson_id" ON "public"."articles" USING "btree" ("lesson_id");



CREATE INDEX "idx_course_enrollments_course_role" ON "public"."course_enrollments" USING "btree" ("course_id", "role");



CREATE INDEX "idx_course_enrollments_user_course" ON "public"."course_enrollments" USING "btree" ("user_id", "course_id");



CREATE INDEX "idx_course_instructors_active" ON "public"."course_instructors" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_course_instructors_course_active" ON "public"."course_instructors" USING "btree" ("course_id", "is_active");



CREATE INDEX "idx_course_instructors_course_id" ON "public"."course_instructors" USING "btree" ("course_id");



CREATE INDEX "idx_course_instructors_course_instructor_active" ON "public"."course_instructors" USING "btree" ("course_id", "instructor_id", "is_active");



CREATE INDEX "idx_course_instructors_instructor_active" ON "public"."course_instructors" USING "btree" ("instructor_id", "is_active");



CREATE INDEX "idx_course_instructors_instructor_id" ON "public"."course_instructors" USING "btree" ("instructor_id");



CREATE INDEX "idx_courses_created_by" ON "public"."courses" USING "btree" ("created_by");



CREATE INDEX "idx_courses_slug" ON "public"."courses" USING "btree" ("slug");



CREATE INDEX "idx_courses_status_created" ON "public"."courses" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_courses_status_created_by" ON "public"."courses" USING "btree" ("status", "created_by");



CREATE INDEX "idx_enrollments_course_enrolled" ON "public"."course_enrollments" USING "btree" ("course_id", "enrolled_at" DESC);



CREATE INDEX "idx_enrollments_recent" ON "public"."course_enrollments" USING "btree" ("enrolled_at" DESC);



CREATE INDEX "idx_enrollments_role_enrolled" ON "public"."course_enrollments" USING "btree" ("role", "enrolled_at" DESC);



CREATE INDEX "idx_enrollments_user_course" ON "public"."course_enrollments" USING "btree" ("user_id", "course_id");



CREATE INDEX "idx_enrollments_user_enrolled" ON "public"."course_enrollments" USING "btree" ("user_id", "enrolled_at" DESC);



CREATE INDEX "idx_lesson_progress_completed" ON "public"."lesson_progress" USING "btree" ("lesson_id", "completed_at", "status");



CREATE INDEX "idx_lesson_progress_completed_at" ON "public"."lesson_progress" USING "btree" ("completed_at" DESC) WHERE ("status" = 'completed'::"public"."progress_status");



CREATE INDEX "idx_lesson_progress_lesson_status" ON "public"."lesson_progress" USING "btree" ("lesson_id", "status");



CREATE INDEX "idx_lesson_progress_started_at" ON "public"."lesson_progress" USING "btree" ("started_at" DESC) WHERE ("started_at" IS NOT NULL);



CREATE INDEX "idx_lesson_progress_user_lesson" ON "public"."lesson_progress" USING "btree" ("user_id", "lesson_id");



CREATE INDEX "idx_lesson_progress_user_status" ON "public"."lesson_progress" USING "btree" ("user_id", "status");



CREATE INDEX "idx_lessons_module_id" ON "public"."lessons" USING "btree" ("module_id");



CREATE INDEX "idx_lessons_module_position" ON "public"."lessons" USING "btree" ("module_id", "position");



CREATE INDEX "idx_lessons_module_position_status" ON "public"."lessons" USING "btree" ("module_id", "position", "status");



CREATE INDEX "idx_lessons_module_status" ON "public"."lessons" USING "btree" ("module_id", "status");



CREATE INDEX "idx_lessons_module_type" ON "public"."lessons" USING "btree" ("module_id", "lesson_type");



CREATE INDEX "idx_lessons_type" ON "public"."lessons" USING "btree" ("lesson_type");



CREATE INDEX "idx_modules_course_id" ON "public"."modules" USING "btree" ("course_id");



CREATE INDEX "idx_modules_course_position" ON "public"."modules" USING "btree" ("course_id", "position");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email") WHERE ("email" IS NOT NULL);



CREATE INDEX "idx_profiles_id_role" ON "public"."profiles" USING "btree" ("id") INCLUDE ("role");



CREATE INDEX "idx_profiles_role_active" ON "public"."profiles" USING "btree" ("role", "id");



CREATE INDEX "idx_profiles_role_id" ON "public"."profiles" USING "btree" ("id", "role");



CREATE INDEX "idx_project_submissions_platform" ON "public"."project_submissions" USING "btree" ("submission_platform");



CREATE INDEX "idx_project_submissions_project_id" ON "public"."project_submissions" USING "btree" ("project_id");



CREATE INDEX "idx_project_submissions_project_status" ON "public"."project_submissions" USING "btree" ("project_id", "status");



CREATE INDEX "idx_project_submissions_project_user" ON "public"."project_submissions" USING "btree" ("project_id", "user_id");



CREATE INDEX "idx_project_submissions_reviewed_by" ON "public"."project_submissions" USING "btree" ("reviewed_by") WHERE ("reviewed_by" IS NOT NULL);



CREATE INDEX "idx_project_submissions_reviewer" ON "public"."project_submissions" USING "btree" ("reviewed_by", "reviewed_at" DESC) WHERE ("reviewed_by" IS NOT NULL);



CREATE INDEX "idx_project_submissions_status" ON "public"."project_submissions" USING "btree" ("status");



CREATE INDEX "idx_project_submissions_status_submitted" ON "public"."project_submissions" USING "btree" ("status", "submitted_at" DESC);



CREATE UNIQUE INDEX "idx_project_submissions_unique_user_project" ON "public"."project_submissions" USING "btree" ("project_id", "user_id");



CREATE INDEX "idx_project_submissions_user_id" ON "public"."project_submissions" USING "btree" ("user_id");



CREATE INDEX "idx_project_submissions_user_status" ON "public"."project_submissions" USING "btree" ("user_id", "status");



CREATE INDEX "idx_projects_lesson_id" ON "public"."projects" USING "btree" ("lesson_id");



CREATE INDEX "idx_question_options_question" ON "public"."question_options" USING "btree" ("question_id");



CREATE INDEX "idx_question_options_question_id_lookup" ON "public"."question_options" USING "btree" ("question_id");



CREATE INDEX "idx_question_options_question_position" ON "public"."question_options" USING "btree" ("question_id", "position");



CREATE INDEX "idx_questions_id_lookup" ON "public"."questions" USING "btree" ("id");



CREATE INDEX "idx_questions_quiz" ON "public"."questions" USING "btree" ("quiz_id");



CREATE INDEX "idx_questions_quiz_position" ON "public"."questions" USING "btree" ("quiz_id", "position");



CREATE INDEX "idx_quiz_attempts_completed" ON "public"."quiz_attempts" USING "btree" ("completed_at") WHERE ("completed_at" IS NOT NULL);



CREATE INDEX "idx_quiz_attempts_quiz_id" ON "public"."quiz_attempts" USING "btree" ("quiz_id");



CREATE INDEX "idx_quiz_attempts_quiz_user" ON "public"."quiz_attempts" USING "btree" ("quiz_id", "user_id");



CREATE INDEX "idx_quiz_attempts_started" ON "public"."quiz_attempts" USING "btree" ("started_at" DESC);



CREATE INDEX "idx_quiz_attempts_user_completed" ON "public"."quiz_attempts" USING "btree" ("user_id", "completed_at");



CREATE INDEX "idx_quiz_attempts_user_id" ON "public"."quiz_attempts" USING "btree" ("user_id");



CREATE INDEX "idx_quiz_attempts_user_quiz" ON "public"."quiz_attempts" USING "btree" ("user_id", "quiz_id", "completed_at" DESC);



CREATE INDEX "idx_quizzes_lesson_id" ON "public"."quizzes" USING "btree" ("lesson_id");



CREATE INDEX "idx_user_answers_attempt_id" ON "public"."user_answers" USING "btree" ("attempt_id");



CREATE INDEX "idx_user_answers_attempt_question" ON "public"."user_answers" USING "btree" ("attempt_id", "question_id");



CREATE INDEX "idx_user_answers_question_id" ON "public"."user_answers" USING "btree" ("question_id");



CREATE INDEX "idx_video_questions_video_id" ON "public"."video_questions" USING "btree" ("video_id");



CREATE INDEX "idx_video_questions_video_timestamp" ON "public"."video_questions" USING "btree" ("video_id", "timestamp_seconds");



CREATE INDEX "idx_videos_lesson" ON "public"."videos" USING "btree" ("lesson_id");



CREATE INDEX "idx_videos_lesson_id" ON "public"."videos" USING "btree" ("lesson_id");



CREATE INDEX "idx_videos_provider" ON "public"."videos" USING "btree" ("provider_video_id") WHERE ("provider_video_id" IS NOT NULL);



CREATE INDEX "test_activity_logs_created" ON "public"."activity_logs" USING "btree" ("created_at" DESC);



CREATE OR REPLACE TRIGGER "trigger_update_project_submission_updated_at" BEFORE UPDATE ON "public"."project_submissions" FOR EACH ROW EXECUTE FUNCTION "public"."update_project_submission_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_quiz_attempt_updated_at" BEFORE UPDATE ON "public"."quiz_attempts" FOR EACH ROW EXECUTE FUNCTION "public"."update_quiz_attempt_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_validate_lesson_completion" BEFORE INSERT OR UPDATE ON "public"."lesson_progress" FOR EACH ROW EXECUTE FUNCTION "public"."validate_lesson_completion"();



CREATE OR REPLACE TRIGGER "update_course_instructors_updated_at" BEFORE UPDATE ON "public"."course_instructors" FOR EACH ROW EXECUTE FUNCTION "public"."update_course_instructors_updated_at"();



CREATE OR REPLACE TRIGGER "validate_course_instructor_assignment_trigger" BEFORE INSERT OR UPDATE ON "public"."course_instructors" FOR EACH ROW EXECUTE FUNCTION "public"."validate_course_instructor_assignment"();



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_instructors"
    ADD CONSTRAINT "course_instructors_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."course_instructors"
    ADD CONSTRAINT "course_instructors_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_instructors"
    ADD CONSTRAINT "course_instructors_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lesson_progress"
    ADD CONSTRAINT "lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_progress"
    ADD CONSTRAINT "lesson_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_submissions"
    ADD CONSTRAINT "project_submissions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_submissions"
    ADD CONSTRAINT "project_submissions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_submissions"
    ADD CONSTRAINT "project_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_options"
    ADD CONSTRAINT "question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_answers"
    ADD CONSTRAINT "user_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "public"."quiz_attempts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_answers"
    ADD CONSTRAINT "user_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_answers"
    ADD CONSTRAINT "user_answers_selected_option_id_fkey" FOREIGN KEY ("selected_option_id") REFERENCES "public"."question_options"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_questions"
    ADD CONSTRAINT "video_questions_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE "public"."activity_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "activity_logs_select" ON "public"."activity_logs" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role"))))));



CREATE POLICY "activity_logs_select_policy" ON "public"."activity_logs" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"public"."user_role"))))));



CREATE POLICY "activity_logs_service_role" ON "public"."activity_logs" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."articles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "articles_comprehensive" ON "public"."articles" USING (("public"."is_admin"() OR ("public"."is_instructor"() AND (EXISTS ( SELECT 1
   FROM "public"."lessons" "l"
  WHERE (("l"."id" = "articles"."lesson_id") AND "public"."is_instructor_of_course"(( SELECT "modules"."course_id"
           FROM "public"."modules"
          WHERE ("modules"."id" = "l"."module_id"))))))) OR ((( SELECT "auth"."role"() AS "role") = 'anon'::"text") AND (EXISTS ( SELECT 1
   FROM (("public"."lessons" "l"
     JOIN "public"."modules" "m" ON (("m"."id" = "l"."module_id")))
     JOIN "public"."courses" "c" ON (("c"."id" = "m"."course_id")))
  WHERE (("l"."id" = "articles"."lesson_id") AND ("c"."status" = 'published'::"public"."course_status"))))) OR ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text") AND "public"."is_student"() AND (EXISTS ( SELECT 1
   FROM ("public"."lessons" "l"
     JOIN "public"."modules" "m" ON (("m"."id" = "l"."module_id")))
  WHERE (("l"."id" = "articles"."lesson_id") AND "public"."is_enrolled_in_course"("m"."course_id"))))))) WITH CHECK (("public"."is_admin"() OR ("public"."is_instructor"() AND (EXISTS ( SELECT 1
   FROM "public"."lessons" "l"
  WHERE (("l"."id" = "articles"."lesson_id") AND "public"."is_instructor_of_course"(( SELECT "modules"."course_id"
           FROM "public"."modules"
          WHERE ("modules"."id" = "l"."module_id")))))))));



ALTER TABLE "public"."course_enrollments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "course_enrollments_comprehensive" ON "public"."course_enrollments" USING (("public"."is_admin"() OR ("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_instructor_of_course"("course_id"))) WITH CHECK (("public"."is_admin"() OR ("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_instructor_of_course"("course_id")));



ALTER TABLE "public"."course_instructors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "course_instructors_comprehensive" ON "public"."course_instructors" USING (("public"."is_admin"() OR ("instructor_id" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK (("public"."is_admin"() OR ("instructor_id" = ( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "courses_comprehensive" ON "public"."courses" USING (("public"."is_admin"() OR "public"."is_instructor_of_course"("id") OR (("status" = 'published'::"public"."course_status") AND (( SELECT "auth"."role"() AS "role") = 'anon'::"text")) OR "public"."is_enrolled_in_course"("id"))) WITH CHECK (("public"."is_admin"() OR "public"."is_instructor_of_course"("id")));



ALTER TABLE "public"."lesson_progress" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lesson_progress_modify" ON "public"."lesson_progress" TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))))) WITH CHECK ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role"))))));



CREATE POLICY "lesson_progress_select" ON "public"."lesson_progress" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'instructor'::"public"."user_role"])))))));



ALTER TABLE "public"."lessons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lessons_comprehensive" ON "public"."lessons" USING (("public"."is_admin"() OR "public"."is_instructor_of_course"(( SELECT "modules"."course_id"
   FROM "public"."modules"
  WHERE ("modules"."id" = "lessons"."module_id"))) OR ((( SELECT "auth"."role"() AS "role") = 'anon'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."modules" "m"
     JOIN "public"."courses" "c" ON (("c"."id" = "m"."course_id")))
  WHERE (("m"."id" = "lessons"."module_id") AND ("c"."status" = 'published'::"public"."course_status"))))) OR ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text") AND "public"."is_student"() AND "public"."is_enrolled_in_course"(( SELECT "modules"."course_id"
   FROM "public"."modules"
  WHERE ("modules"."id" = "lessons"."module_id")))))) WITH CHECK (("public"."is_admin"() OR "public"."is_instructor_of_course"(( SELECT "modules"."course_id"
   FROM "public"."modules"
  WHERE ("modules"."id" = "lessons"."module_id")))));



ALTER TABLE "public"."modules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "modules_comprehensive" ON "public"."modules" USING (("public"."is_admin"() OR "public"."is_instructor_of_course"("course_id") OR ((( SELECT "auth"."role"() AS "role") = 'anon'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "modules"."course_id") AND ("c"."status" = 'published'::"public"."course_status"))))) OR ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text") AND "public"."is_student"() AND "public"."is_enrolled_in_course"("course_id")))) WITH CHECK (("public"."is_admin"() OR "public"."is_instructor_of_course"("course_id")));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_comprehensive" ON "public"."profiles" USING (("public"."is_admin"() OR ("id" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK (("public"."is_admin"() OR ("id" = ( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."project_submissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "project_submissions_delete_policy" ON "public"."project_submissions" FOR DELETE USING (((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("status" <> ALL (ARRAY['approved'::"public"."submission_status", 'rejected'::"public"."submission_status"]))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"public"."user_role"))))));



CREATE POLICY "project_submissions_insert_policy" ON "public"."project_submissions" FOR INSERT WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"public"."user_role"))))));



CREATE POLICY "project_submissions_select_policy" ON "public"."project_submissions" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM ((("public"."projects" "p"
     JOIN "public"."lessons" "l" ON (("p"."lesson_id" = "l"."id")))
     JOIN "public"."modules" "m" ON (("l"."module_id" = "m"."id")))
     JOIN "public"."course_instructors" "ci" ON (("m"."course_id" = "ci"."course_id")))
  WHERE (("p"."id" = "project_submissions"."project_id") AND ("ci"."instructor_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ci"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"public"."user_role"))))));



CREATE POLICY "project_submissions_update_policy" ON "public"."project_submissions" FOR UPDATE USING (((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("status" <> ALL (ARRAY['approved'::"public"."submission_status", 'rejected'::"public"."submission_status"]))) OR (EXISTS ( SELECT 1
   FROM ((("public"."projects" "p"
     JOIN "public"."lessons" "l" ON (("p"."lesson_id" = "l"."id")))
     JOIN "public"."modules" "m" ON (("l"."module_id" = "m"."id")))
     JOIN "public"."course_instructors" "ci" ON (("m"."course_id" = "ci"."course_id")))
  WHERE (("p"."id" = "project_submissions"."project_id") AND ("ci"."instructor_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ci"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"public"."user_role"))))));



ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "projects_comprehensive" ON "public"."projects" USING (("public"."is_admin"() OR ("public"."is_instructor"() AND (EXISTS ( SELECT 1
   FROM "public"."lessons" "l"
  WHERE (("l"."id" = "projects"."lesson_id") AND "public"."is_instructor_of_course"(( SELECT "modules"."course_id"
           FROM "public"."modules"
          WHERE ("modules"."id" = "l"."module_id"))))))) OR ((( SELECT "auth"."role"() AS "role") = 'anon'::"text") AND (EXISTS ( SELECT 1
   FROM (("public"."lessons" "l"
     JOIN "public"."modules" "m" ON (("m"."id" = "l"."module_id")))
     JOIN "public"."courses" "c" ON (("c"."id" = "m"."course_id")))
  WHERE (("l"."id" = "projects"."lesson_id") AND ("c"."status" = 'published'::"public"."course_status"))))) OR ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text") AND "public"."is_student"() AND (EXISTS ( SELECT 1
   FROM ("public"."lessons" "l"
     JOIN "public"."modules" "m" ON (("m"."id" = "l"."module_id")))
  WHERE (("l"."id" = "projects"."lesson_id") AND "public"."is_enrolled_in_course"("m"."course_id"))))))) WITH CHECK (("public"."is_admin"() OR ("public"."is_instructor"() AND (EXISTS ( SELECT 1
   FROM "public"."lessons" "l"
  WHERE (("l"."id" = "projects"."lesson_id") AND "public"."is_instructor_of_course"(( SELECT "modules"."course_id"
           FROM "public"."modules"
          WHERE ("modules"."id" = "l"."module_id")))))))));



ALTER TABLE "public"."question_options" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "question_options_comprehensive" ON "public"."question_options" USING (("public"."is_admin"() OR ("public"."is_instructor"() AND (EXISTS ( SELECT 1
   FROM (("public"."questions" "q"
     JOIN "public"."quizzes" "qz" ON (("qz"."id" = "q"."quiz_id")))
     JOIN "public"."lessons" "l" ON (("l"."id" = "qz"."lesson_id")))
  WHERE (("q"."id" = "question_options"."question_id") AND "public"."is_instructor_of_course"(( SELECT "modules"."course_id"
           FROM "public"."modules"
          WHERE ("modules"."id" = "l"."module_id"))))))) OR ("public"."is_question_published"("question_id") AND (( SELECT "auth"."role"() AS "role") = ANY (ARRAY['anon'::"text", 'authenticated'::"text"]))))) WITH CHECK (("public"."is_admin"() OR ("public"."is_instructor"() AND (EXISTS ( SELECT 1
   FROM (("public"."questions" "q"
     JOIN "public"."quizzes" "qz" ON (("qz"."id" = "q"."quiz_id")))
     JOIN "public"."lessons" "l" ON (("l"."id" = "qz"."lesson_id")))
  WHERE (("q"."id" = "question_options"."question_id") AND "public"."is_instructor_of_course"(( SELECT "modules"."course_id"
           FROM "public"."modules"
          WHERE ("modules"."id" = "l"."module_id")))))))));



ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "questions_comprehensive" ON "public"."questions" USING (("public"."is_admin"() OR ("public"."is_instructor"() AND (EXISTS ( SELECT 1
   FROM ("public"."quizzes" "q"
     JOIN "public"."lessons" "l" ON (("l"."id" = "q"."lesson_id")))
  WHERE (("q"."id" = "questions"."quiz_id") AND "public"."is_instructor_of_course"(( SELECT "modules"."course_id"
           FROM "public"."modules"
          WHERE ("modules"."id" = "l"."module_id"))))))) OR ("public"."is_question_published"("id") AND (( SELECT "auth"."role"() AS "role") = ANY (ARRAY['anon'::"text", 'authenticated'::"text"]))))) WITH CHECK (("public"."is_admin"() OR ("public"."is_instructor"() AND (EXISTS ( SELECT 1
   FROM ("public"."quizzes" "q"
     JOIN "public"."lessons" "l" ON (("l"."id" = "q"."lesson_id")))
  WHERE (("q"."id" = "questions"."quiz_id") AND "public"."is_instructor_of_course"(( SELECT "modules"."course_id"
           FROM "public"."modules"
          WHERE ("modules"."id" = "l"."module_id")))))))));



ALTER TABLE "public"."quiz_attempts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quiz_attempts_insert_policy" ON "public"."quiz_attempts" FOR INSERT WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"public"."user_role"))))));



CREATE POLICY "quiz_attempts_select_policy" ON "public"."quiz_attempts" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM ((("public"."quizzes" "q"
     JOIN "public"."lessons" "l" ON (("q"."lesson_id" = "l"."id")))
     JOIN "public"."modules" "m" ON (("l"."module_id" = "m"."id")))
     JOIN "public"."course_instructors" "ci" ON (("m"."course_id" = "ci"."course_id")))
  WHERE (("q"."id" = "quiz_attempts"."quiz_id") AND ("ci"."instructor_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ci"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"public"."user_role"))))));



CREATE POLICY "quiz_attempts_update_policy" ON "public"."quiz_attempts" FOR UPDATE USING (((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("completed_at" IS NULL)) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"public"."user_role"))))));



ALTER TABLE "public"."quizzes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quizzes_comprehensive" ON "public"."quizzes" USING (("public"."is_admin"() OR ("public"."is_instructor"() AND (EXISTS ( SELECT 1
   FROM "public"."lessons" "l"
  WHERE (("l"."id" = "quizzes"."lesson_id") AND "public"."is_instructor_of_course"(( SELECT "modules"."course_id"
           FROM "public"."modules"
          WHERE ("modules"."id" = "l"."module_id"))))))) OR ((( SELECT "auth"."role"() AS "role") = 'anon'::"text") AND (EXISTS ( SELECT 1
   FROM (("public"."lessons" "l"
     JOIN "public"."modules" "m" ON (("m"."id" = "l"."module_id")))
     JOIN "public"."courses" "c" ON (("c"."id" = "m"."course_id")))
  WHERE (("l"."id" = "quizzes"."lesson_id") AND ("c"."status" = 'published'::"public"."course_status"))))) OR ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text") AND "public"."is_student"() AND (EXISTS ( SELECT 1
   FROM ("public"."lessons" "l"
     JOIN "public"."modules" "m" ON (("m"."id" = "l"."module_id")))
  WHERE (("l"."id" = "quizzes"."lesson_id") AND "public"."is_enrolled_in_course"("m"."course_id"))))))) WITH CHECK (("public"."is_admin"() OR ("public"."is_instructor"() AND (EXISTS ( SELECT 1
   FROM "public"."lessons" "l"
  WHERE (("l"."id" = "quizzes"."lesson_id") AND "public"."is_instructor_of_course"(( SELECT "modules"."course_id"
           FROM "public"."modules"
          WHERE ("modules"."id" = "l"."module_id")))))))));



ALTER TABLE "public"."user_answers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_answers_insert_policy" ON "public"."user_answers" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."quiz_attempts" "qa"
  WHERE (("qa"."id" = "user_answers"."attempt_id") AND ("qa"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"public"."user_role"))))));



CREATE POLICY "user_answers_select_policy" ON "public"."user_answers" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."quiz_attempts" "qa"
  WHERE (("qa"."id" = "user_answers"."attempt_id") AND ("qa"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM (((("public"."quiz_attempts" "qa"
     JOIN "public"."quizzes" "q" ON (("qa"."quiz_id" = "q"."id")))
     JOIN "public"."lessons" "l" ON (("q"."lesson_id" = "l"."id")))
     JOIN "public"."modules" "m" ON (("l"."module_id" = "m"."id")))
     JOIN "public"."course_instructors" "ci" ON (("m"."course_id" = "ci"."course_id")))
  WHERE (("qa"."id" = "user_answers"."attempt_id") AND ("ci"."instructor_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ci"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"public"."user_role"))))));



ALTER TABLE "public"."video_questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "video_questions_comprehensive" ON "public"."video_questions" USING (("public"."is_admin"() OR "public"."is_instructor"() OR (( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"))) WITH CHECK (("public"."is_admin"() OR "public"."is_instructor"()));



ALTER TABLE "public"."videos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "videos_comprehensive" ON "public"."videos" USING (("public"."is_admin"() OR ("public"."is_instructor"() AND (EXISTS ( SELECT 1
   FROM "public"."lessons" "l"
  WHERE (("l"."id" = "videos"."lesson_id") AND "public"."is_instructor_of_course"(( SELECT "modules"."course_id"
           FROM "public"."modules"
          WHERE ("modules"."id" = "l"."module_id"))))))) OR ((( SELECT "auth"."role"() AS "role") = 'anon'::"text") AND (EXISTS ( SELECT 1
   FROM (("public"."lessons" "l"
     JOIN "public"."modules" "m" ON (("m"."id" = "l"."module_id")))
     JOIN "public"."courses" "c" ON (("c"."id" = "m"."course_id")))
  WHERE (("l"."id" = "videos"."lesson_id") AND ("c"."status" = 'published'::"public"."course_status"))))) OR ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text") AND "public"."is_student"() AND (EXISTS ( SELECT 1
   FROM ("public"."lessons" "l"
     JOIN "public"."modules" "m" ON (("m"."id" = "l"."module_id")))
  WHERE (("l"."id" = "videos"."lesson_id") AND "public"."is_enrolled_in_course"("m"."course_id"))))))) WITH CHECK (("public"."is_admin"() OR ("public"."is_instructor"() AND (EXISTS ( SELECT 1
   FROM "public"."lessons" "l"
  WHERE (("l"."id" = "videos"."lesson_id") AND "public"."is_instructor_of_course"(( SELECT "modules"."course_id"
           FROM "public"."modules"
          WHERE ("modules"."id" = "l"."module_id")))))))));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_instructor_to_course"("p_course_id" "uuid", "p_instructor_id" "uuid", "p_assigned_by" "uuid", "p_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."assign_instructor_to_course"("p_course_id" "uuid", "p_instructor_id" "uuid", "p_assigned_by" "uuid", "p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_instructor_to_course"("p_course_id" "uuid", "p_instructor_id" "uuid", "p_assigned_by" "uuid", "p_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_quiz_score"("p_attempt_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_quiz_score"("p_attempt_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_quiz_score"("p_attempt_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_access_course_content"("course_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_access_course_content"("course_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_course_content"("course_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_access_next_lesson"("p_current_lesson_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_access_next_lesson"("p_current_lesson_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_next_lesson"("p_current_lesson_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_complete_lesson"("p_lesson_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_complete_lesson"("p_lesson_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_complete_lesson"("p_lesson_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_edit_course"("course_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_edit_course"("course_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_edit_course"("course_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_enroll_in_course"("course_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_enroll_in_course"("course_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_enroll_in_course"("course_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_manage_courses"() TO "anon";
GRANT ALL ON FUNCTION "public"."can_manage_courses"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_courses"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_activity_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_activity_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_activity_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_best_quiz_attempt"("p_quiz_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_best_quiz_attempt"("p_quiz_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_best_quiz_attempt"("p_quiz_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_course_analytics"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_course_analytics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_course_analytics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_course_id_from_question"("question_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_course_id_from_question"("question_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_course_id_from_question"("question_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_course_progress"("course_slug" "text", "user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_course_progress"("course_slug" "text", "user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_course_progress"("course_slug" "text", "user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_courses_with_stats"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_courses_with_stats"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_courses_with_stats"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_enrollment_status"("course_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_enrollment_status"("course_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_enrollment_status"("course_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_latest_quiz_attempt"("p_quiz_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_latest_quiz_attempt"("p_quiz_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_latest_quiz_attempt"("p_quiz_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_project_submission_stats"("p_project_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_project_submission_stats"("p_project_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_project_submission_stats"("p_project_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_quiz_statistics"("p_quiz_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_quiz_statistics"("p_quiz_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_quiz_statistics"("p_quiz_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_project_submission"("p_project_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_project_submission"("p_project_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_project_submission"("p_project_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_approved_project_submission"("p_lesson_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_approved_project_submission"("p_lesson_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_approved_project_submission"("p_lesson_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("user_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("user_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("user_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_anonymous"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_anonymous"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_anonymous"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_authenticated"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_authenticated"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_authenticated"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_course_creator"("course_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_course_creator"("course_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_course_creator"("course_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_enrolled_in_course"("course_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_enrolled_in_course"("course_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_enrolled_in_course"("course_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_instructor"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_instructor"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_instructor"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_instructor_of_course"("course_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_instructor_of_course"("course_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_instructor_of_course"("course_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_question_published"("question_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_question_published"("question_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_question_published"("question_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_student"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_student"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_student"() TO "service_role";



GRANT ALL ON FUNCTION "public"."owns_profile"("profile_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."owns_profile"("profile_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."owns_profile"("profile_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_instructor_from_course"("p_course_id" "uuid", "p_instructor_id" "uuid", "p_removed_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_instructor_from_course"("p_course_id" "uuid", "p_instructor_id" "uuid", "p_removed_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_instructor_from_course"("p_course_id" "uuid", "p_instructor_id" "uuid", "p_removed_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_course_instructors_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_course_instructors_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_course_instructors_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_project_submission_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_project_submission_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_project_submission_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_quiz_attempt_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_quiz_attempt_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_quiz_attempt_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_profile_exists"() TO "anon";
GRANT ALL ON FUNCTION "public"."user_profile_exists"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_profile_exists"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_course_instructor_assignment"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_course_instructor_assignment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_course_instructor_assignment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_lesson_completion"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_lesson_completion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_lesson_completion"() TO "service_role";



GRANT ALL ON TABLE "public"."activity_logs" TO "anon";
GRANT ALL ON TABLE "public"."activity_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_logs" TO "service_role";



GRANT ALL ON TABLE "public"."articles" TO "anon";
GRANT ALL ON TABLE "public"."articles" TO "authenticated";
GRANT ALL ON TABLE "public"."articles" TO "service_role";



GRANT ALL ON TABLE "public"."course_enrollments" TO "anon";
GRANT ALL ON TABLE "public"."course_enrollments" TO "authenticated";
GRANT ALL ON TABLE "public"."course_enrollments" TO "service_role";



GRANT ALL ON TABLE "public"."course_instructors" TO "anon";
GRANT ALL ON TABLE "public"."course_instructors" TO "authenticated";
GRANT ALL ON TABLE "public"."course_instructors" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON TABLE "public"."lesson_progress" TO "anon";
GRANT ALL ON TABLE "public"."lesson_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."lesson_progress" TO "service_role";



GRANT ALL ON TABLE "public"."lessons" TO "anon";
GRANT ALL ON TABLE "public"."lessons" TO "authenticated";
GRANT ALL ON TABLE "public"."lessons" TO "service_role";



GRANT ALL ON TABLE "public"."modules" TO "anon";
GRANT ALL ON TABLE "public"."modules" TO "authenticated";
GRANT ALL ON TABLE "public"."modules" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."project_submissions" TO "anon";
GRANT ALL ON TABLE "public"."project_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."project_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."question_options" TO "anon";
GRANT ALL ON TABLE "public"."question_options" TO "authenticated";
GRANT ALL ON TABLE "public"."question_options" TO "service_role";



GRANT ALL ON TABLE "public"."questions" TO "anon";
GRANT ALL ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_attempts" TO "anon";
GRANT ALL ON TABLE "public"."quiz_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."quizzes" TO "anon";
GRANT ALL ON TABLE "public"."quizzes" TO "authenticated";
GRANT ALL ON TABLE "public"."quizzes" TO "service_role";



GRANT ALL ON TABLE "public"."user_answers" TO "anon";
GRANT ALL ON TABLE "public"."user_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."user_answers" TO "service_role";



GRANT ALL ON TABLE "public"."video_questions" TO "anon";
GRANT ALL ON TABLE "public"."video_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."video_questions" TO "service_role";



GRANT ALL ON TABLE "public"."videos" TO "anon";
GRANT ALL ON TABLE "public"."videos" TO "authenticated";
GRANT ALL ON TABLE "public"."videos" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







RESET ALL;
