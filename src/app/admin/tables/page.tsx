'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CoursesAdminDashboard } from '@/components/admin/CoursesAdminDashboard';
import { UserAdminDashboard } from '@/components/admin/UserAdminDashboard';
import VideoAdminDashboard from '@/components/admin/VideoAdminDashboard';
import { activityLogService } from '@/services/activityLogService';

// Icons
const Icons = {
  Table: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  Database: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
    </svg>
  ),
  Book: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  Users: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
  ),
  Video: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  Question: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Article: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Code: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  Progress: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
};

interface DatabaseTable {
  name: string;
  displayName: string;
  description: string;
  icon: React.ReactNode;
  status: 'available' | 'development';
  recordCount?: number;
  category: 'core' | 'content' | 'user' | 'analytics';
}

const databaseTables: DatabaseTable[] = [
  // Core Tables
  {
    name: 'courses',
    displayName: 'Courses',
    description: 'Manage courses, their metadata, and publishing status',
    icon: <Icons.Book />,
    status: 'available',
    category: 'core'
  },
  {
    name: 'modules',
    displayName: 'Course Modules',
    description: 'Course sections and module organization',
    icon: <Icons.Database />,
    status: 'development',
    category: 'core'
  },
  {
    name: 'lessons',
    displayName: 'Lessons',
    description: 'Individual lessons within course modules',
    icon: <Icons.Table />,
    status: 'development',
    category: 'core'
  },
  
  // Content Tables
  {
    name: 'videos',
    displayName: 'Videos',
    description: 'Video content and metadata for lessons',
    icon: <Icons.Video />,
    status: 'available',
    category: 'content'
  },
  {
    name: 'articles',
    displayName: 'Articles',
    description: 'Written content and articles for lessons',
    icon: <Icons.Article />,
    status: 'development',
    category: 'content'
  },
  {
    name: 'projects',
    displayName: 'Projects',
    description: 'Project assignments and submissions',
    icon: <Icons.Code />,
    status: 'development',
    category: 'content'
  },
  {
    name: 'quizzes',
    displayName: 'Quizzes',
    description: 'Quiz content and assessment tools',
    icon: <Icons.Question />,
    status: 'development',
    category: 'content'
  },
  {
    name: 'questions',
    displayName: 'Quiz Questions',
    description: 'Individual questions for quizzes and assessments',
    icon: <Icons.Question />,
    status: 'development',
    category: 'content'
  },
  {
    name: 'question_options',
    displayName: 'Question Options',
    description: 'Answer options for multiple choice questions',
    icon: <Icons.Question />,
    status: 'development',
    category: 'content'
  },
  {
    name: 'video_questions',
    displayName: 'Video Questions',
    description: 'Time-based questions within video content',
    icon: <Icons.Video />,
    status: 'development',
    category: 'content'
  },
  
  // User Tables
  {
    name: 'profiles',
    displayName: 'User Profiles',
    description: 'User account information and preferences',
    icon: <Icons.Users />,
    status: 'available',
    category: 'user'
  },
  {
    name: 'course_enrollments',
    displayName: 'Course Enrollments',
    description: 'User enrollments and course access management',
    icon: <Icons.Users />,
    status: 'development',
    category: 'user'
  },
  {
    name: 'lesson_progress',
    displayName: 'Lesson Progress',
    description: 'Track user progress through individual lessons',
    icon: <Icons.Progress />,
    status: 'development',
    category: 'analytics'
  }
];

const categoryColors = {
  core: 'bg-blue-50 border-blue-200',
  content: 'bg-green-50 border-green-200',
  user: 'bg-purple-50 border-purple-200',
  analytics: 'bg-orange-50 border-orange-200'
};

const categoryLabels = {
  core: 'Core System',
  content: 'Content Management',
  user: 'User Management',
  analytics: 'Analytics & Progress'
};

const categoryBadgeColors = {
  core: 'bg-blue-600 text-white border-blue-600',
  content: 'bg-green-600 text-white border-green-600',
  user: 'bg-purple-600 text-white border-purple-600',
  analytics: 'bg-orange-600 text-white border-orange-600'
};

export default function TablesPage() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  React.useEffect(() => {
    // Log that tables page was accessed
    activityLogService.logSystemAction('TABLES_VIEW', 'Database tables management page accessed');
  }, []);

  const filteredTables = selectedCategory === 'all' 
    ? databaseTables 
    : databaseTables.filter(table => table.category === selectedCategory);

  const categories = ['all', 'core', 'content', 'user', 'analytics'];

  const handleTableClick = (tableName: string, status: string) => {
    if (status === 'available') {
      // Log table access
      activityLogService.logTableAccess(tableName);
      setSelectedTable(tableName);
    }
  };

  const handleBackToTables = () => {
    setSelectedTable(null);
  };

  // If a table is selected and it's courses, show the CoursesAdminDashboard
  if (selectedTable === 'courses') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Courses Management</h1>
            <p className="text-gray-600">Full CRUD operations for course management</p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleBackToTables}
            className="flex items-center space-x-2"
          >
            <span>←</span>
            <span>Back to Tables</span>
          </Button>
        </div>
        <CoursesAdminDashboard />
      </div>
    );
  }

  // If a table is selected and it's profiles, show the UserAdminDashboard
  if (selectedTable === 'profiles') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">User Management</h1>
            <p className="text-gray-600">Full CRUD operations for user accounts and profiles</p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleBackToTables}
            className="flex items-center space-x-2"
          >
            <span>←</span>
            <span>Back to Tables</span>
          </Button>
        </div>
        <UserAdminDashboard />
      </div>
    );
  }

  // If a table is selected and it's videos, show the VideoAdminDashboard
  if (selectedTable === 'videos') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Video Management</h1>
            <p className="text-gray-600">Full CRUD operations for video content and metadata</p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleBackToTables}
            className="flex items-center space-x-2"
          >
            <span>←</span>
            <span>Back to Tables</span>
          </Button>
        </div>
        <VideoAdminDashboard />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Database Tables</h1>
        <p className="text-gray-600">
          Manage all database tables and content. Click on available tables to access CRUD operations.
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            onClick={() => setSelectedCategory(category)}
            className="capitalize"
          >
            {category === 'all' ? 'All Tables' : categoryLabels[category as keyof typeof categoryLabels]}
          </Button>
        ))}
      </div>

      {/* Tables Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredTables.map((table) => (
          <Card 
            key={table.name}
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
              table.status === 'available' 
                ? 'hover:shadow-lg border-2 hover:border-blue-300' 
                : 'opacity-75 hover:opacity-90'
            } ${categoryColors[table.category]}`}
            onClick={() => handleTableClick(table.name, table.status)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {table.icon}
                  <CardTitle className="text-lg text-gray-900">{table.displayName}</CardTitle>
                </div>
                <Badge 
                  variant={table.status === 'available' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {table.status === 'available' ? 'Available' : 'Under Development'}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Badge 
                  variant="outline" 
                  className={`text-xs font-medium ${categoryBadgeColors[table.category]}`}
                >
                  {categoryLabels[table.category]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm text-gray-600 leading-relaxed">
                {table.description}
              </CardDescription>
              
              {table.status === 'available' && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800 mb-1">
                    ✅ Full CRUD Operations Available
                  </p>
                  <p className="text-xs text-green-600">
                    Click to manage records, create, edit, delete, and view detailed information.
                  </p>
                </div>
              )}
              
              {table.status === 'development' && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm font-medium text-amber-800 mb-1">
                    🚧 Under Development
                  </p>
                  <p className="text-xs text-amber-600">
                    CRUD operations are being developed for this table. Check back soon!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-8">
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Icons.Database />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Available Tables</p>
                <p className="text-2xl font-bold text-gray-900">
                  {databaseTables.filter(t => t.status === 'available').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Icons.Progress />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">In Development</p>
                <p className="text-2xl font-bold text-gray-900">
                  {databaseTables.filter(t => t.status === 'development').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Icons.Table />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tables</p>
                <p className="text-2xl font-bold text-gray-900">{databaseTables.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Icons.Book />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-2xl font-bold text-gray-900">4</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900 flex items-center space-x-2">
            <Icons.Table />
            <span>How to Use Table Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2">Available Tables</h4>
              <ul className="space-y-1 text-sm">
                <li>• Click on tables marked as "Available" to access full CRUD operations</li>
                <li>• Create, edit, delete, and manage records</li>
                <li>• Real-time data updates and validation</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Under Development</h4>
              <ul className="space-y-1 text-sm">
                <li>• Tables marked as "Under Development" are not yet functional</li>
                <li>• CRUD interfaces are being built for these tables</li>
                <li>• Check back for updates as development progresses</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
