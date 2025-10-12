import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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

    // Get enrolled courses with progress
    const { data: enrolledCoursesData } = await supabase
      .from('course_enrollments')
      .select(`
        courses!inner (
          id,
          title,
          description,
          cover_image,
          created_at
        ),
        progress,
        completed,
        last_accessed
      `)
      .eq('user_id', user.id)
      .order('last_accessed', { ascending: false });

    // Get recent courses (all published courses for discovery)
    const { data: recentCoursesData } = await supabase
      .from('courses')
      .select('id, title, description, cover_image, created_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(6);

    const enrolledCourses: EnrolledCourse[] = enrolledCoursesData?.map((enrollment: any) => ({
      ...enrollment.courses,
      progress: enrollment.progress || 0,
      last_accessed: enrollment.last_accessed,
      completed: enrollment.completed || false,
    })) || [];

    const recentCourses = recentCoursesData || [];

    // Calculate stats
    const totalCourses = enrolledCourses.length;
    const completedCourses = enrolledCourses.filter(course => course.completed).length;
    const inProgressCourses = enrolledCourses.filter(course => !course.completed && (course.progress || 0) > 0).length;

    const stats = {
      totalCourses,
      completedCourses,
      inProgressCourses,
      totalHours: totalCourses * 2.5, // Estimated hours per course
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