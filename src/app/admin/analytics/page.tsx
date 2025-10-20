'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { analyticsService, PlatformAnalytics, CourseAnalytics, UserEngagementData } from '@/services/analyticsService';

// Icons
const Icons = {
  Users: () => (
    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
  ),
  Courses: () => (
    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  Enrollments: () => (
    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Activity: () => (
    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  Refresh: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0V9a8 8 0 1115.356 2M15 15v5h-.582M4.582 15A8.001 8.001 0 0019.418 15M4.582 15V15a8 8 0 01-.582-6" />
    </svg>
  ),
  TrendUp: () => (
    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  TrendDown: () => (
    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    </svg>
  )
};

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6B7280'];

export default function AdminAnalyticsPage() {
  const [platformAnalytics, setPlatformAnalytics] = useState<PlatformAnalytics | null>(null);
  const [courseAnalytics, setCourseAnalytics] = useState<CourseAnalytics[]>([]);
  const [engagementData, setEngagementData] = useState<UserEngagementData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [platform, courses, engagement] = await Promise.all([
        analyticsService.getPlatformAnalytics(),
        analyticsService.getCourseAnalytics(),
        analyticsService.getUserEngagementData(30)
      ]);

      setPlatformAnalytics(platform);
      setCourseAnalytics(courses);
      setEngagementData(engagement);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-lg text-gray-600">Loading analytics data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-4">Error: {error}</div>
          <Button onClick={handleRefresh} variant="outline">
            <Icons.Refresh />
            <span className="ml-2">Retry</span>
          </Button>
        </div>
      </div>
    );
  }

  // Calculate total enrollments for percentage calculation
  const totalTopEnrollments = courseAnalytics.slice(0, 5).reduce((sum, course) => sum + course.enrollmentCount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Learning Platform Analytics</h1>
          <p className="text-gray-600">Real-time insights into your learning platform performance</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <Icons.Refresh />
          <span className="ml-2">{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
        </Button>
      </div>

      {/* Key Metrics */}
      {platformAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Icons.Users />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{platformAnalytics.totalUsers.toLocaleString()}</p>
                  <div className="flex items-center text-sm">
                    {platformAnalytics.userGrowthRate > 0 ? <Icons.TrendUp /> : <Icons.TrendDown />}
                    <span className={platformAnalytics.userGrowthRate > 0 ? 'text-green-600' : 'text-red-600'}>
                      {platformAnalytics.userGrowthRate.toFixed(1)}% growth
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Icons.Courses />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Published Courses</p>
                  <p className="text-2xl font-bold text-gray-900">{platformAnalytics.publishedCourses}</p>
                  <p className="text-sm text-gray-500">
                    {platformAnalytics.coursesCreatedThisMonth} new this month
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Icons.Enrollments />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Total Enrollments</p>
                  <p className="text-2xl font-bold text-gray-900">{platformAnalytics.totalEnrollments.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">
                    {platformAnalytics.enrollmentsThisMonth} new this month
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Icons.Activity />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Avg. Completion Rate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {courseAnalytics.length > 0 
                      ? (courseAnalytics.reduce((sum, course) => sum + course.completionRate, 0) / courseAnalytics.length).toFixed(1) 
                      : '0.0'}%
                  </p>
                  <p className="text-sm text-gray-500">
                    {platformAnalytics.activeUsersToday} active today
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Engagement Chart */}
        <Card>
          <CardHeader>
            <CardTitle>User Engagement (30 Days)</CardTitle>
            <CardDescription>Daily active users, new users, and enrollments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="activeUsers" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    name="Active Users"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="newUsers" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    name="New Users"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="enrollments" 
                    stroke="#8B5CF6" 
                    strokeWidth={2}
                    name="Enrollments"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Most Taken Courses */}
        <Card>
          <CardHeader>
            <CardTitle>Most Taken Courses</CardTitle>
            <CardDescription>Top 5 courses by enrollment count</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {courseAnalytics.slice(0, 5).map((course, index) => (
                <div key={course.courseId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {course.courseTitle.length > 40 ? course.courseTitle.substring(0, 40) + '...' : course.courseTitle}
                      </h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>{course.enrollmentCount} students</span>
                        <span>{course.completionRate.toFixed(1)}% completion</span>
                        <span>{course.totalLessons} lessons</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">{course.enrollmentCount}</div>
                    <div className="text-xs text-gray-500">enrollments</div>
                  </div>
                </div>
              ))}
              {courseAnalytics.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No courses found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Performance Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Courses */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Courses</CardTitle>
            <CardDescription>Courses with highest completion rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {courseAnalytics
                .sort((a, b) => b.completionRate - a.completionRate)
                .slice(0, 5)
                .map((course, index) => (
                  <div key={course.courseId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 text-sm">
                        {course.courseTitle.length > 35 ? course.courseTitle.substring(0, 35) + '...' : course.courseTitle}
                      </h4>
                      <div className="flex items-center space-x-3 text-xs text-gray-600 mt-1">
                        <span>{course.enrollmentCount} enrolled</span>
                        <span>{course.completionCount} completed</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={course.completionRate > 70 ? "default" : course.completionRate > 40 ? "secondary" : "destructive"}>
                        {course.completionRate.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Course Metrics Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Course Metrics Summary</CardTitle>
            <CardDescription>Overall course performance statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {courseAnalytics.length > 0 
                      ? Math.max(...courseAnalytics.map(c => c.completionRate)).toFixed(1)
                      : '0'}%
                  </div>
                  <div className="text-sm text-gray-600">Best Completion Rate</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {courseAnalytics.length > 0 
                      ? Math.max(...courseAnalytics.map(c => c.enrollmentCount))
                      : 0}
                  </div>
                  <div className="text-sm text-gray-600">Most Popular Course</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Courses with 70%+ completion</span>
                  <Badge variant="default">
                    {courseAnalytics.filter(c => c.completionRate >= 70).length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Courses with 100+ enrollments</span>
                  <Badge variant="secondary">
                    {courseAnalytics.filter(c => c.enrollmentCount >= 100).length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Courses created this month</span>
                  <Badge variant="outline">
                    {platformAnalytics?.coursesCreatedThisMonth || 0}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Course Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Course Performance</CardTitle>
          <CardDescription>Comprehensive metrics for all courses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Course</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Enrollments</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Completions</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Completion Rate</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Avg. Progress</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Lessons</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Performance</th>
                </tr>
              </thead>
              <tbody>
                {courseAnalytics
                  .sort((a, b) => b.enrollmentCount - a.enrollmentCount) // Sort by popularity
                  .map((course) => (
                    <tr key={course.courseId} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{course.courseTitle}</div>
                        <div className="text-xs text-gray-500">
                          Created {new Date(course.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold">{course.enrollmentCount}</td>
                      <td className="py-3 px-4">{course.completionCount}</td>
                      <td className="py-3 px-4">
                        <Badge variant={course.completionRate > 70 ? "default" : course.completionRate > 40 ? "secondary" : "destructive"}>
                          {course.completionRate.toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="py-3 px-4">{course.averageProgress.toFixed(1)}%</td>
                      <td className="py-3 px-4">{course.totalLessons}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1">
                          {course.completionRate > 70 && course.enrollmentCount > 50 && (
                            <Badge variant="default" className="text-xs">Excellent</Badge>
                          )}
                          {course.completionRate > 50 && course.enrollmentCount > 20 && course.completionRate <= 70 && (
                            <Badge variant="secondary" className="text-xs">Good</Badge>
                          )}
                          {(course.completionRate <= 50 || course.enrollmentCount <= 20) && (
                            <Badge variant="outline" className="text-xs">Needs Attention</Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Learning Insights */}
      {platformAnalytics && (
        <Card>
          <CardHeader>
            <CardTitle>Learning Platform Insights</CardTitle>
            <CardDescription>Key performance indicators and learning trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Student Engagement */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-3">Student Engagement</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700">Daily Active Users</span>
                    <span className="font-bold text-blue-900">{platformAnalytics.dailyActiveUsers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700">Weekly Active Users</span>
                    <span className="font-bold text-blue-900">{platformAnalytics.weeklyActiveUsers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700">Monthly Active Users</span>
                    <span className="font-bold text-blue-900">{platformAnalytics.monthlyActiveUsers}</span>
                  </div>
                  <div className="mt-3 p-2 bg-blue-100 rounded">
                    <span className="text-xs text-blue-800">
                      Engagement Rate: {((platformAnalytics.dailyActiveUsers / platformAnalytics.totalUsers) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Course Statistics */}
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-3">Course Statistics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-green-700">Published Courses</span>
                    <span className="font-bold text-green-900">{platformAnalytics.publishedCourses}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-green-700">Avg. Course Duration</span>
                    <span className="font-bold text-green-900">{platformAnalytics.averageCourseDuration} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-green-700">Total Content Items</span>
                    <span className="font-bold text-green-900">{platformAnalytics.totalLessons + platformAnalytics.totalQuizzes}</span>
                  </div>
                  <div className="mt-3 p-2 bg-green-100 rounded">
                    <span className="text-xs text-green-800">
                      Avg. Enrollments per Course: {(platformAnalytics.totalEnrollments / platformAnalytics.publishedCourses).toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-semibold text-purple-900 mb-3">Performance Metrics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-purple-700">User Growth Rate</span>
                    <span className="font-bold text-purple-900">{platformAnalytics.userGrowthRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-purple-700">Avg. User Progress</span>
                    <span className="font-bold text-purple-900">{platformAnalytics.averageProgressPerUser.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-purple-700">Sessions per User</span>
                    <span className="font-bold text-purple-900">{platformAnalytics.averageSessionsPerUser.toFixed(1)}</span>
                  </div>
                  <div className="mt-3 p-2 bg-purple-100 rounded">
                    <span className="text-xs text-purple-800">
                      Monthly Growth: {((platformAnalytics.newUsersThisMonth / platformAnalytics.totalUsers) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Learning Content Overview */}
      {platformAnalytics && (
        <Card>
          <CardHeader>
            <CardTitle>Learning Content Library</CardTitle>
            <CardDescription>Overview of your educational content and resources</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600 mb-2">{platformAnalytics.totalLessons}</div>
                <div className="text-sm font-medium text-gray-600">Total Lessons</div>
                <div className="text-xs text-blue-600 mt-1">
                  {(platformAnalytics.totalLessons / platformAnalytics.publishedCourses).toFixed(1)} avg per course
                </div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600 mb-2">{platformAnalytics.totalModules}</div>
                <div className="text-sm font-medium text-gray-600">Total Modules</div>
                <div className="text-xs text-green-600 mt-1">
                  {(platformAnalytics.totalModules / platformAnalytics.publishedCourses).toFixed(1)} avg per course
                </div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600 mb-2">{platformAnalytics.totalQuizzes}</div>
                <div className="text-sm font-medium text-gray-600">Total Quizzes</div>
                <div className="text-xs text-purple-600 mt-1">
                  Assessment coverage: {((platformAnalytics.totalQuizzes / platformAnalytics.publishedCourses) * 100).toFixed(0)}%
                </div>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-3xl font-bold text-orange-600 mb-2">{platformAnalytics.totalVideos}</div>
                <div className="text-sm font-medium text-gray-600">Video Lessons</div>
                <div className="text-xs text-orange-600 mt-1">
                  {((platformAnalytics.totalVideos / platformAnalytics.totalLessons) * 100).toFixed(0)}% of lessons
                </div>
              </div>
            </div>

            {/* Learning Efficiency Metrics */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3">Learning Efficiency Indicators</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Content Density:</span>
                  <span className="font-bold text-gray-900 ml-2">
                    {(platformAnalytics.totalLessons + platformAnalytics.totalQuizzes)} items
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Video Content Ratio:</span>
                  <span className="font-bold text-gray-900 ml-2">
                    {((platformAnalytics.totalVideos / platformAnalytics.totalLessons) * 100).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Assessment Coverage:</span>
                  <span className="font-bold text-gray-900 ml-2">
                    {(platformAnalytics.totalQuizzes / platformAnalytics.publishedCourses).toFixed(1)} per course
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supabase Integration Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21.362 9.354H12V.396a.396.396 0 0 0-.716-.233L2.203 12.424l-.401.562a1.04 1.04 0 0 0 0 1.028l.401.562 9.081 12.261a.396.396 0 0 0 .716-.233V17.646h9.362c.653 0 1.182-.529 1.182-1.182v-5.928c0-.653-.529-1.182-1.182-1.182Z"/>
            </svg>
            <span>Supabase Analytics Integration</span>
          </CardTitle>
          <CardDescription>
            Enhanced analytics powered by your Supabase database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Available Integrations</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Real-time database metrics</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>User activity tracking from your activity_logs table</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Course engagement analytics</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>Database performance monitoring</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-3">Additional Supabase Analytics</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <p>For more detailed Supabase analytics, visit:</p>
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="font-mono text-xs">
                    1. Your Supabase Dashboard<br />
                    2. Database → Logs<br />
                    3. Edge Functions → Analytics<br />
                    4. Auth → Users (for user analytics)
                  </p>
                </div>
                <p className="text-xs">
                  Pro tip: Enable Supabase's built-in analytics in your project settings
                  for detailed performance metrics, query analytics, and usage statistics.
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h5 className="font-medium text-blue-900 mb-2">🚀 Performance Tips</h5>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• All analytics data is fetched from your live Supabase database</li>
              <li>• Enable RLS policies for security while maintaining admin access</li>
              <li>• Consider adding database indexes for frequently queried analytics data</li>
              <li>• Use Supabase's built-in caching for faster analytics queries</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
