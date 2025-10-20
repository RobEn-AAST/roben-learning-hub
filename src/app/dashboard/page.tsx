import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { Navigation } from '@/components/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BookOpen, Clock, Award, TrendingUp, Play, CheckCircle } from 'lucide-react';

// Export dynamic rendering configuration
export const dynamic = 'force-dynamic';

interface Course {
  id: string;
  title: string;
  description: string;
  cover_image?: string;
  created_at: string;
}

interface EnrolledCourse extends Course {
  progress?: number;
  last_accessed?: string;
  completed?: boolean;
}

interface DashboardData {
  user: any;
  enrolledCourses: EnrolledCourse[];
  recentCourses: Course[];
  stats: {
    totalCourses: number;
    completedCourses: number;
    inProgressCourses: number;
    totalHours: number;
  };
}

async function getDashboardData(): Promise<DashboardData> {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      redirect('/auth/login');
    }

    // Get enrolled courses
    const { data: enrolledCoursesData } = await supabase
      .from('course_enrollments')
      .select(`
        enrolled_at,
        courses!inner (
          id,
          title,
          description,
          cover_image,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .eq('role', 'student')
      .order('enrolled_at', { ascending: false });

    // Get recent courses (all published courses for discovery)
    // Use service client to bypass RLS issues for public course data
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: recentCoursesData } = await supabaseAdmin
      .from('courses')
      .select('id, title, description, cover_image, created_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    // Get enrolled course IDs for filtering
    const enrolledCourseIds = enrolledCoursesData?.map((e: any) => e.courses.id) || [];
    
    // Filter out enrolled courses from discovery and limit to 6
    const availableCourses = (recentCoursesData || [])
      .filter((course: any) => !enrolledCourseIds.includes(course.id));
    
    // If no available courses (user enrolled in all), show recent courses with a note
    const recentCourses = availableCourses.slice(0, 6);

    // If no enrolled courses, return early
    if (!enrolledCoursesData || enrolledCoursesData.length === 0) {
      return {
        user,
        enrolledCourses: [],
        recentCourses,
        stats: {
          totalCourses: 0,
          completedCourses: 0,
          inProgressCourses: 0,
          totalHours: 0,
        },
      };
    }

    const courseIds = enrolledCoursesData.map((e: any) => e.courses.id);

    // Batch fetch all modules for all courses at once
    const { data: allModules } = await supabase
      .from('modules')
      .select('id, course_id')
      .in('course_id', courseIds);

    const modulesByCourse = new Map<string, string[]>();
    const allModuleIds = (allModules || []).map(m => {
      if (!modulesByCourse.has(m.course_id)) {
        modulesByCourse.set(m.course_id, []);
      }
      modulesByCourse.get(m.course_id)!.push(m.id);
      return m.id;
    });

    // If no modules, return early with enrolled courses but no progress
    if (allModuleIds.length === 0) {
      const enrolledCourses = enrolledCoursesData.map((enrollment: any) => ({
        ...enrollment.courses,
        progress: 0,
        last_accessed: enrollment.enrolled_at,
        completed: false,
      }));

      return {
        user,
        enrolledCourses,
        recentCourses,
        stats: {
          totalCourses: enrolledCourses.length,
          completedCourses: 0,
          inProgressCourses: 0,
          totalHours: 0,
        },
      };
    }

    // Batch fetch all lessons for all modules at once
    const { data: allLessons } = await supabase
      .from('lessons')
      .select('id, module_id')
      .in('module_id', allModuleIds);

    const lessonsByModule = new Map<string, string[]>();
    const allLessonIds = (allLessons || []).map(l => {
      if (!lessonsByModule.has(l.module_id)) {
        lessonsByModule.set(l.module_id, []);
      }
      lessonsByModule.get(l.module_id)!.push(l.id);
      return l.id;
    });

    // Batch fetch all content (videos, articles, quizzes) and progress at once
    const [videosData, articlesData, quizzesData, allProgressData] = await Promise.all([
      supabase.from('videos').select('duration_seconds, lesson_id').in('lesson_id', allLessonIds),
      supabase.from('articles').select('reading_time_minutes, lesson_id').in('lesson_id', allLessonIds),
      supabase.from('quizzes').select('time_limit_minutes, lesson_id').in('lesson_id', allLessonIds),
      supabase.from('lesson_progress').select('lesson_id, status, completed_at').eq('user_id', user.id).in('lesson_id', allLessonIds)
    ]);

    // Create lookup maps for faster access
    const videosByLesson = new Map<string, number>();
    (videosData.data || []).forEach(v => {
      const current = videosByLesson.get(v.lesson_id) || 0;
      videosByLesson.set(v.lesson_id, current + (v.duration_seconds || 0) / 60);
    });

    const articlesByLesson = new Map<string, number>();
    (articlesData.data || []).forEach(a => {
      const current = articlesByLesson.get(a.lesson_id) || 0;
      articlesByLesson.set(a.lesson_id, current + (a.reading_time_minutes || 0));
    });

    const quizzesByLesson = new Map<string, number>();
    (quizzesData.data || []).forEach(q => {
      const current = quizzesByLesson.get(q.lesson_id) || 0;
      quizzesByLesson.set(q.lesson_id, current + (q.time_limit_minutes || 0));
    });

    const progressByLesson = new Map<string, any>();
    (allProgressData.data || []).forEach(p => {
      progressByLesson.set(p.lesson_id, p);
    });

    // Calculate progress for each enrolled course
    let totalMinutes = 0;
    const enrolledCourses: EnrolledCourse[] = enrolledCoursesData.map((enrollment: any) => {
      const courseId = enrollment.courses.id;
      const moduleIds = modulesByCourse.get(courseId) || [];
      
      if (moduleIds.length === 0) {
        return {
          ...enrollment.courses,
          progress: 0,
          last_accessed: enrollment.enrolled_at,
          completed: false,
        };
      }

      // Get all lesson IDs for this course
      const lessonIds: string[] = [];
      moduleIds.forEach(moduleId => {
        const lessons = lessonsByModule.get(moduleId) || [];
        lessonIds.push(...lessons);
      });

      if (lessonIds.length === 0) {
        return {
          ...enrollment.courses,
          progress: 0,
          last_accessed: enrollment.enrolled_at,
          completed: false,
        };
      }

      // Calculate total duration for this course
      lessonIds.forEach(lessonId => {
        totalMinutes += (videosByLesson.get(lessonId) || 0);
        totalMinutes += (articlesByLesson.get(lessonId) || 0);
        totalMinutes += (quizzesByLesson.get(lessonId) || 0);
      });

      // Calculate progress
      const completedLessons = lessonIds.filter(lessonId => {
        const progress = progressByLesson.get(lessonId);
        return progress?.status === 'completed';
      }).length;

      const progress = lessonIds.length > 0 ? Math.round((completedLessons / lessonIds.length) * 100) : 0;
      const completed = completedLessons === lessonIds.length && lessonIds.length > 0;

      // Get last accessed time
      let lastAccessed = enrollment.enrolled_at;
      lessonIds.forEach(lessonId => {
        const lessonProgress = progressByLesson.get(lessonId);
        if (lessonProgress?.completed_at) {
          const progressTime = new Date(lessonProgress.completed_at);
          const currentLast = new Date(lastAccessed);
          if (progressTime > currentLast) {
            lastAccessed = lessonProgress.completed_at;
          }
        }
      });

      return {
        ...enrollment.courses,
        progress,
        last_accessed: lastAccessed,
        completed,
      };
    });

    // Calculate stats
    const totalCourses = enrolledCourses.length;
    const completedCourses = enrolledCourses.filter(course => course.completed).length;
    const inProgressCourses = enrolledCourses.filter(course => !course.completed && (course.progress || 0) > 0).length;
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

    const stats = {
      totalCourses,
      completedCourses,
      inProgressCourses,
      totalHours,
    };

    return {
      user,
      enrolledCourses,
      recentCourses,
      stats,
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    redirect('/auth/login');
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={data.user} userRole="user" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {data.user.user_metadata?.full_name || data.user.email}!
          </h1>
          <p className="text-gray-600 mt-2">Continue your learning journey</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Enrolled Courses</p>
                  <p className="text-2xl font-bold text-gray-900">{data.stats.totalCourses}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{data.stats.completedCourses}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-gray-900">{data.stats.inProgressCourses}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Hours</p>
                  <p className="text-2xl font-bold text-gray-900">{data.stats.totalHours}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* My Courses */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  My Learning
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.enrolledCourses.length > 0 ? (
                  <div className="space-y-4">
                    {data.enrolledCourses.map((course) => (
                      <div key={course.id} className="flex items-center p-4 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
                          {course.cover_image ? (
                            <img 
                              src={course.cover_image} 
                              alt={course.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BookOpen className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        
                        <div className="ml-4 flex-1">
                          <h3 className="font-semibold text-gray-900">{course.title}</h3>
                          <p className="text-sm text-gray-600 mb-2">{course.description}</p>
                          
                          {/* Progress Bar */}
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${course.progress || 0}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{course.progress || 0}% complete</p>
                        </div>
                        
                        <div className="ml-4">
                          <Button asChild size="sm">
                            <Link href={`/courses/${course.id}`}>
                              {course.completed ? 'Review' : 'Continue'}
                              <Play className="h-4 w-4 ml-2" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No courses enrolled yet</h3>
                    <p className="text-gray-600 mb-4">Discover amazing courses to start your learning journey</p>
                    <Button asChild>
                      <Link href="/courses">Browse Courses</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Discover New Courses */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Discover New Courses
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.recentCourses.length > 0 ? (
                  <div className="space-y-4">
                    {data.recentCourses.slice(0, 3).map((course) => (
                      <div key={course.id} className="border rounded-lg p-3 hover:shadow-md transition-shadow">
                        <h4 className="font-semibold text-sm text-gray-900 mb-1">{course.title}</h4>
                        <p className="text-xs text-gray-600 mb-3 line-clamp-2">{course.description}</p>
                        <Button asChild size="sm" variant="outline" className="w-full">
                          <Link href={`/courses/${course.id}`}>View Course</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <BookOpen className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No new courses available for discovery right now.</p>
                    <p className="text-xs text-gray-400 mt-1">Check back later for new courses!</p>
                  </div>
                )}
                
                <div className="mt-4 pt-4 border-t">
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/courses">View All Courses</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}