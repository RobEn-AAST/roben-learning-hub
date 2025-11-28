import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createAdminClient,
  getAllowedInstructorCourseIds,
} from "@/lib/adminHelpers";

// Simple in-memory cache with TTL
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(courseId: string) {
  return `student-progress-${courseId}`;
}

function getCachedData(key: string) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedData(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
  // Clean up old cache entries (simple cleanup)
  if (cache.size > 100) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;

    // Check cache first to reduce database load
    const cacheKey = getCacheKey(courseId);
    const cachedResult = getCachedData(cacheKey);
    if (cachedResult) {
      return NextResponse.json(cachedResult);
    }

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user profile and verify instructor role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (profileError || profile.role !== "instructor") {
      return NextResponse.json(
        { error: "Instructor access required" },
        { status: 403 }
      );
    }

    // Verify instructor has access to this course
    const allowedCourseIds = await getAllowedInstructorCourseIds(user.id);
    if (!allowedCourseIds.includes(courseId)) {
      return NextResponse.json(
        { error: "Access denied to this course" },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    // Get course details
    const { data: course, error: courseError } = await admin
      .from("courses")
      .select("id, title")
      .eq("id", courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Get all students enrolled in this course - OPTIMIZED: Only essential fields
    const { data: enrollments, error: enrollmentsError } = await admin
      .from("course_enrollments")
      .select(
        `
        id,
        enrolled_at,
        profiles (
          id,
          email,
          first_name,
          last_name
        )
      `
      )
      .eq("course_id", courseId)
      .eq("role", "student")
      .limit(100); // OPTIMIZATION: Limit to 100 students max

    if (enrollmentsError) {
      console.error("Error fetching enrollments:", enrollmentsError);
      return NextResponse.json(
        { error: "Failed to fetch enrollments" },
        { status: 500 }
      );
    }

    if (!enrollments || enrollments.length === 0) {
      // Get total lessons count even when no students
      const { data: totalLessons, error: lessonsError } = await admin
        .from("lessons")
        .select(
          `
          id,
          modules (
            course_id
          )
        `
        )
        .eq("modules.course_id", courseId);

      const totalLessonsCount = totalLessons?.length || 0;

      return NextResponse.json({
        course,
        students: [],
        totalStudents: 0,
        courseStats: {
          totalLessons: totalLessonsCount,
          averageProgress: 0,
          studentsCompleted: 0,
        },
      });
    }

    const studentIds = enrollments
      .map((e: any) => e.profiles?.id)
      .filter(Boolean);

    // Get lesson progress for all students in this course
    const { data: progressData, error: progressError } = await admin
      .from("lesson_progress")
      .select(
        `
        user_id,
        lesson_id,
        status,
        completed_at,
        lessons (
          id,
          title,
          modules (
            course_id
          )
        )
      `
      )
      .in("user_id", studentIds)
      .eq("lessons.modules.course_id", courseId);

    if (progressError) {
      console.error("Error fetching progress:", progressError);
    }

    // Get quiz attempts for all students in this course - OPTIMIZED: Recent only
    const { data: quizAttempts, error: quizError } = await admin
      .from("quiz_attempts")
      .select(
        `
        user_id,
        quiz_id,
        score,
        passed,
        completed_at,
        quizzes (
          title,
          lessons (
            title
          )
        )
      `
      )
      .in("user_id", studentIds)
      .eq("quizzes.lessons.modules.course_id", courseId)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(500); // OPTIMIZATION: Limit quiz attempts to recent 500

    if (quizError) {
      console.error("Error fetching quiz attempts:", quizError);
    }

    // Get total lessons count for progress calculation
    const { data: totalLessons, error: lessonsError } = await admin
      .from("lessons")
      .select(
        `
        id,
        modules (
          course_id
        )
      `
      )
      .eq("modules.course_id", courseId);

    const totalLessonsCount = totalLessons?.length || 0;

    // Process data for each student
    const studentsWithProgress = enrollments
      .map((enrollment: any) => {
        const student = enrollment.profiles;

        // Skip if no profile data
        if (!student) return null;

        // Calculate progress
        const studentProgress =
          progressData?.filter((p) => p.user_id === student.id) || [];
        const completedLessons = studentProgress.filter(
          (p) => p.status === "completed"
        ).length;
        const progressPercentage =
          totalLessonsCount > 0
            ? Math.round((completedLessons / totalLessonsCount) * 100)
            : 0;

        // Get quiz scores - OPTIMIZED: Simplified data structure
        const studentQuizAttempts =
          quizAttempts?.filter((qa) => qa.user_id === student.id) || [];
        const quizScores = studentQuizAttempts
          .slice(0, 3)
          .map((attempt: any) => ({
            quizTitle: attempt.quizzes?.title || "Unknown Quiz",
            lessonTitle: attempt.quizzes?.lessons?.title || "Unknown Lesson",
            score: attempt.score,
            passed: attempt.passed,
            completedAt: attempt.completed_at,
          }));

        // Calculate overall quiz average
        const validScores = quizScores
          .filter((q) => q.score !== null)
          .map((q) => Number(q.score));
        const averageQuizScore =
          validScores.length > 0
            ? Math.round(
                validScores.reduce((sum, score) => sum + score, 0) /
                  validScores.length
              )
            : null;

        return {
          id: student.id,
          email: student.email,
          firstName: student.first_name,
          lastName: student.last_name,
          avatarUrl: student.avatar_url,
          enrolledAt: enrollment.enrolled_at,
          progress: {
            completedLessons,
            totalLessons: totalLessonsCount,
            percentage: progressPercentage,
          },
          quizStats: {
            totalAttempts: studentQuizAttempts.length,
            averageScore: averageQuizScore,
            passedQuizzes: studentQuizAttempts.filter((qa: any) => qa.passed)
              .length,
          },
          quizScores: quizScores, // Already limited to 3
          recentActivity: studentProgress
            .filter((p: any) => p.completed_at)
            .sort(
              (a: any, b: any) =>
                new Date(b.completed_at).getTime() -
                new Date(a.completed_at).getTime()
            )
            .slice(0, 2) // OPTIMIZATION: Reduce to 2 recent activities
            .map((p: any) => ({
              lessonTitle: p.lessons?.title || "Unknown Lesson",
              completedAt: p.completed_at,
            })),
        };
      })
      .filter(Boolean);

    // Sort students by progress percentage (highest first)
    const validStudents = studentsWithProgress as any[];
    validStudents.sort((a, b) => b.progress.percentage - a.progress.percentage);

    const result = {
      course,
      students: validStudents,
      totalStudents: validStudents.length,
      courseStats: {
        totalLessons: totalLessonsCount,
        averageProgress:
          validStudents.length > 0
            ? Math.round(
                validStudents.reduce(
                  (sum, s) => sum + s.progress.percentage,
                  0
                ) / validStudents.length
              )
            : 0,
        studentsCompleted: validStudents.filter(
          (s) => s.progress.percentage === 100
        ).length,
      },
    };

    // Cache the result for better performance
    setCachedData(cacheKey, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching student progress:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
