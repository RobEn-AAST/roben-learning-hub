import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const supabaseAdmin = createServiceClient(supabaseUrl, serviceRoleKey);
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get all user progress records
    const { data: allProgress, error: progressError } = await supabaseAdmin
      .from('lesson_progress')
      .select(`
        id,
        lesson_id,
        status,
        created_at,
        updated_at,
        lessons!lesson_id (
          id,
          title,
          position,
          modules!module_id (
            id,
            title,
            position,
            course_id
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (progressError) {
      console.error('Error fetching progress:', progressError);
      return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
    }

    // Group by lesson_id to find duplicates
    const progressByLesson = new Map();
    const duplicates: any[] = [];
    
    allProgress?.forEach(progress => {
      const lessonId = progress.lesson_id;
      if (progressByLesson.has(lessonId)) {
        duplicates.push({
          lessonId,
          existing: progressByLesson.get(lessonId),
          duplicate: progress
        });
      } else {
        progressByLesson.set(lessonId, progress);
      }
    });

    // Group by course to analyze course-level progress
    const courseProgress = new Map();
    
    allProgress?.forEach(progress => {
      if (!progress.lessons) return;
      
      const lesson = progress.lessons as any; // Type casting to handle Supabase type inference
      const courseId = lesson.modules?.course_id;
      if (!courseId) return;
      
      if (!courseProgress.has(courseId)) {
        courseProgress.set(courseId, {
          courseId,
          lessons: [],
          completedCount: 0,
          totalLessons: 0
        });
      }
      
      const course = courseProgress.get(courseId);
      course.lessons.push({
        id: progress.lesson_id,
        title: lesson.title,
        position: lesson.position,
        modulePosition: lesson.modules?.position,
        status: progress.status,
        created_at: progress.created_at
      });
      
      if (progress.status === 'completed') {
        course.completedCount++;
      }
    });

    // Get course details for better analysis
    const courseIds = Array.from(courseProgress.keys());
    const { data: courses, error: coursesError } = await supabaseAdmin
      .from('courses')
      .select(`
        id,
        title,
        modules (
          id,
          position,
          lessons (
            id,
            position
          )
        )
      `)
      .in('id', courseIds);

    // Calculate actual lesson counts per course
    if (courses) {
      courses.forEach(course => {
        const totalLessons = course.modules?.reduce((acc, module) => 
          acc + (module.lessons?.length || 0), 0) || 0;
        
        const courseData = courseProgress.get(course.id);
        if (courseData) {
          courseData.totalLessons = totalLessons;
          courseData.courseTitle = course.title;
        }
      });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email
      },
      summary: {
        totalProgressRecords: allProgress?.length || 0,
        duplicatesCount: duplicates.length,
        coursesWithProgress: courseProgress.size
      },
      duplicates,
      courseProgress: Array.from(courseProgress.values()).map(course => ({
        ...course,
        percentage: course.totalLessons > 0 ? 
          Math.round((course.completedCount / course.totalLessons) * 100) : 0,
        lessons: course.lessons.sort((a: any, b: any) => {
          if (a.modulePosition !== b.modulePosition) {
            return (a.modulePosition || 0) - (b.modulePosition || 0);
          }
          return (a.position || 0) - (b.position || 0);
        })
      })),
      allProgressRecords: allProgress
    }, { status: 200 });

  } catch (error) {
    console.error('Debug progress error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}