'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { coursesService, CourseStats } from '@/services/coursesService';
import { CoursesAdminDashboard } from './CoursesAdminDashboard';

// Icons (using simple SVG for now - you can replace with your preferred icon library)
const Icons = {
  Users: () => (
    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
  ),
  Activity: () => (
    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  Database: () => (
    <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
    </svg>
  ),
  Server: () => (
    <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
    </svg>
  ),
  Settings: () => (
    <svg className="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Logs: () => (
    <svg className="h-6 w-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Book: () => (
    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  )
};

interface DashboardStatsProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
}

function DashboardStats({ title, value, change, changeType = 'neutral', icon }: DashboardStatsProps) {
  const changeColor = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-600'
  }[changeType];

  return (
    <Card className="bg-white">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {icon && <div className="flex-shrink-0">{icon}</div>}
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-black">{value}</p>
              {change && (
                <p className={`text-xs ${changeColor}`}>
                  {change}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  onClick?: () => void;
}

interface RecentActivity {
  id: string;
  type: 'course' | 'system' | 'user';
  message: string;
  timestamp: string;
  status: 'success' | 'warning' | 'info';
}

export function AdminDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState<CourseStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'courses'>('dashboard');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load stats and recent activities
      const [statsData, activitiesData] = await Promise.all([
        coursesService.getCourseStats(),
        coursesService.getRecentActivities(5)
      ]);

      setStats(statsData);
      
      // Transform course activities into dashboard activities
      const activities: RecentActivity[] = activitiesData.map((course, index) => ({
        id: course.id,
        type: 'course' as const,
        message: `Course "${course.title}" was ${course.created_at === course.updated_at ? 'created' : 'updated'}`,
        timestamp: formatTimeAgo(course.updated_at),
        status: course.status === 'published' ? 'success' : 'info' as const
      }));

      setRecentActivity(activities);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  const quickActions: QuickAction[] = [
    {
      title: 'Manage Courses',
      description: 'View, edit, and manage all courses',
      icon: <Icons.Book />,
      href: '/admin/courses',
      onClick: () => setCurrentView('courses')
    },
    {
      title: 'User Management',
      description: 'View and manage user accounts',
      icon: <Icons.Users />,
      href: '/admin/users'
    },
    {
      title: 'System Logs',
      description: 'View system logs and error reports',
      icon: <Icons.Logs />,
      href: '/admin/logs'
    },
    {
      title: 'Analytics',
      description: 'View detailed analytics and reports',
      icon: <Icons.Activity />,
      href: '/admin/analytics'
    },
    {
      title: 'Settings',
      description: 'Configure system settings',
      icon: <Icons.Settings />,
      href: '/admin/settings'
    }
  ];

  const getStatusBadge = (status: RecentActivity['status']) => {
    const variants = {
      success: 'default',
      warning: 'secondary',
      info: 'outline'
    } as const;
    
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  if (currentView === 'courses') {
    return (
      <div>
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => setCurrentView('dashboard')}
            className="mb-4"
          >
            ← Back to Dashboard
          </Button>
        </div>
        <CoursesAdminDashboard />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-lg text-black">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">Admin Dashboard</h1>
          <p className="text-gray-600">
            Welcome back! Here's what's happening with your learning platform.
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Current Time</p>
          <p className="text-lg font-mono text-black">
            {currentTime.toLocaleTimeString()}
          </p>
          <p className="text-sm text-gray-600">
            {currentTime.toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DashboardStats
            title="Total Courses"
            value={stats.totalCourses}
            change={`${stats.publishedCourses} published`}
            changeType="positive"
            icon={<Icons.Book />}
          />
          <DashboardStats
            title="Total Enrollments"
            value={stats.totalEnrollments}
            change="Active learners"
            changeType="neutral"
            icon={<Icons.Users />}
          />
          <DashboardStats
            title="Total Modules"
            value={stats.totalModules}
            change="Course modules"
            changeType="neutral"
            icon={<Icons.Database />}
          />
          <DashboardStats
            title="Total Lessons"
            value={stats.totalLessons}
            change="Learning content"
            changeType="positive"
            icon={<Icons.Activity />}
          />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-black">Quick Actions</CardTitle>
            <CardDescription className="text-gray-600">Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick || (() => window.location.href = action.href)}
                className="w-full flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors text-left"
              >
                {action.icon}
                <div>
                  <p className="font-medium text-black">{action.title}</p>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2 bg-white">
          <CardHeader>
            <CardTitle className="text-black">Recent Activity</CardTitle>
            <CardDescription className="text-gray-600">Latest course and system events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start justify-between space-x-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-black">{activity.message}</p>
                      <p className="text-xs text-gray-600">{activity.timestamp}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {getStatusBadge(activity.status)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No recent activity to display.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Information */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-black">Learning Platform Stats</CardTitle>
            <CardDescription className="text-gray-600">Content and engagement metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-black">Published Courses</span>
                  <Badge variant="default">{stats.publishedCourses}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-black">Draft Courses</span>
                  <Badge variant="secondary">{stats.draftCourses}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-black">Total Modules</span>
                  <Badge variant="outline">{stats.totalModules}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-black">Total Lessons</span>
                  <Badge variant="outline">{stats.totalLessons}</Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-black">System Health</CardTitle>
            <CardDescription className="text-gray-600">Platform status and performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-black">Database Status</span>
              <Badge variant="default">Healthy</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-black">API Status</span>
              <Badge variant="default">Online</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-black">Cache Status</span>
              <Badge variant="default">Active</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-black">Uptime</span>
              <span className="font-mono text-sm text-black">99.9%</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
