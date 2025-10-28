'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useInstructorDashboard } from '@/hooks/useQueryCache';

// Icons
const Icons = {
  Book: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  Module: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  Lesson: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  Status: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  User: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Calendar: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
};

interface Course {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
}

interface Module {
  id: string;
  title: string;
  description: string;
  position: number;
  course_id: string;
  created_at: string;
  courses: { title: string };
}

interface DashboardData {
  profile: {
    id: string;
    role: string;
    // Backend returns first_name/last_name (no full_name column in DB)
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  };
  courses: Course[];
  modules: Module[];
  modulesByCourse: Record<string, Module[]>;
  stats: {
    totalCourses: number;
    totalModules: number;
    totalLessons: number;
    coursesByStatus: Record<string, number>;
  };
}

export function InstructorDashboardNew() {
  // PERFORMANCE: React Query hook - automatic caching and refetching!
  const { data, isLoading, error, refetch } = useInstructorDashboard();
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  // Skeleton loading for initial fetch
  if (isLoading) {
    return (
      <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
        <div className="space-y-2">
          <Skeleton className="h-10 w-96" />
          <Skeleton className="h-5 w-full max-w-2xl" />
        </div>

        {/* Stats Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Courses Skeleton */}
        <Card className="bg-white">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 space-y-4 bg-gray-50 p-8">
        <div className="text-red-600 text-lg">⚠️ {error.message || 'Failed to load dashboard'}</div>
        <Button onClick={() => refetch()}>Try Again</Button>
        <div className="text-sm text-gray-600 max-w-md text-center">
          If you're seeing this error, you might not be assigned to any courses yet. 
          Please contact an administrator or use the debug page to check your assignments.
        </div>
        <Button variant="outline" onClick={() => window.location.href = '/debug-instructor-access'}>
          Debug Access Issues
        </Button>
      </div>
    );
  }

  if (!data || data.courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 space-y-4 bg-gray-50 p-8">
        <div className="text-gray-600 text-lg">📚 No courses assigned</div>
        <div className="text-sm text-gray-500 max-w-md text-center">
          You haven't been assigned to any courses yet. Please contact an administrator to get access to courses.
        </div>
        <Button variant="outline" onClick={() => window.location.href = '/debug-instructor-access'}>
          Check Assignment Status
        </Button>
      </div>
    );
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800 border-green-200';
      case 'draft': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'archived': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const profile = data.profile;
  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    profile?.email ||
    'Instructor';

  return (
    <div className="space-y-6 bg-gray-50 min-h-screen p-4">
      {/* Welcome Header */}
      <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
        <div className="flex items-center space-x-3 mb-2">
          <Icons.User />
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {displayName}!</h1>
        </div>
        <p className="text-gray-600">Manage your assigned courses and track your teaching progress.</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Your Courses</CardTitle>
            <Icons.Book />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{data.stats.totalCourses}</div>
            <p className="text-xs text-gray-600">
              Courses assigned to you
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Total Modules</CardTitle>
            <Icons.Module />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{data.stats.totalModules}</div>
            <p className="text-xs text-gray-600">
              Across all your courses
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Total Lessons</CardTitle>
            <Icons.Lesson />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{data.stats.totalLessons}</div>
            <p className="text-xs text-gray-600">
              Ready for students
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Course Status Overview */}
      {Object.keys(data.stats.coursesByStatus).length > 0 && (
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-gray-900">
              <Icons.Status />
              <span>Course Status Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.stats.coursesByStatus).map(([status, count]) => (
                <Badge key={status} className={getStatusBadgeColor(status)}>
                  {status}: {String(count)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Your Courses */}
      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-gray-900">
            <Icons.Book />
            <span>Your Courses</span>
          </CardTitle>
          <CardDescription className="text-gray-600">
            Courses you're assigned to teach
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
              {data.courses.map((course: Course) => (
                <div key={course.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{course.title}</h3>
                      <p className="text-gray-600 text-sm">{course.description}</p>
                    </div>
                    <Badge className={getStatusBadgeColor(course.status)}>
                      {course.status}
                    </Badge>
                  </div>                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className="flex items-center space-x-1">
                      <Icons.Module />
                      <span>{data.modulesByCourse[course.id]?.length || 0} modules</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Icons.Calendar />
                      <span>Created {new Date(course.created_at).toLocaleDateString()}</span>
                    </span>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCourse(selectedCourse === course.id ? null : course.id)}
                  >
                    {selectedCourse === course.id ? 'Hide Modules' : 'View Modules'}
                  </Button>
                </div>

                {/* Course Modules */}
                {selectedCourse === course.id && data.modulesByCourse[course.id] && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="font-medium mb-3 text-gray-900">Course Modules:</h4>
                    <div className="grid gap-2">
                      {data.modulesByCourse[course.id].map((module: Module) => (
                        <div key={module.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded shadow-sm">
                          <div>
                            <span className="font-medium text-gray-900">{module.position}. {module.title}</span>
                            {module.description && (
                              <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                            )}
                          </div>
                          <Badge variant="outline" className="border-gray-300 text-gray-700">Module</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">Quick Actions</CardTitle>
          <CardDescription className="text-gray-600">Common tasks for instructors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" onClick={() => window.location.href = '/instructor/videos'}>
              Manage Videos
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/debug-instructor-access'}>
              Check Access Status
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}