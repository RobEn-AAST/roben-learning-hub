'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InstructorModulesManager } from '@/components/instructor/InstructorModulesManager';
import { LessonsAdminDashboard } from '@/components/admin/LessonsAdminDashboard';
import VideoAdminDashboard from '@/components/admin/VideoAdminDashboard';
import ArticleAdminDashboard from '@/components/admin/ArticleAdminDashboard';
import ProjectAdminDashboard from '@/components/admin/ProjectAdminDashboard';
import ProjectSubmissionsAdminDashboard from '@/components/admin/ProjectSubmissionsAdminDashboard';
import QuizAdminDashboard from '@/components/admin/QuizAdminDashboard';
import QuizQuestionAdminDashboard from '@/components/admin/QuizQuestionAdminDashboard';
import QuestionOptionAdminDashboard from '@/components/admin/QuestionOptionAdminDashboard';
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
  category: 'content' | 'user' | 'analytics';
}

// Instructor-accessible tables
const databaseTables: DatabaseTable[] = [
  {
    name: 'modules',
    displayName: 'Course Modules',
    description: 'Course sections and module organization',
    icon: <Icons.Database />,
    status: 'available',
    category: 'content'
  },
  {
    name: 'lessons',
    displayName: 'Lessons',
    description: 'Individual lessons within course modules',
    icon: <Icons.Table />,
    status: 'available',
    category: 'content'
  },
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
    status: 'available',
    category: 'content'
  },
  {
    name: 'projects',
    displayName: 'Projects',
    description: 'Project assignments and submissions',
    icon: <Icons.Code />,
    status: 'available',
    category: 'content'
  },
  {
    name: 'project_submissions',
    displayName: 'Project Submissions',
    description: 'Review and grade student project submissions',
    icon: <Icons.Code />,
    status: 'available',
    category: 'analytics'
  },
  {
    name: 'quizzes',
    displayName: 'Quizzes',
    description: 'Quiz content and assessment tools',
    icon: <Icons.Question />,
    status: 'available',
    category: 'content'
  },
  {
    name: 'questions',
    displayName: 'Quiz Questions',
    description: 'Individual questions for quizzes and assessments',
    icon: <Icons.Question />,
    status: 'available',
    category: 'content'
  },
  {
    name: 'question_options',
    displayName: 'Question Options',
    description: 'Answer options for multiple choice questions',
    icon: <Icons.Question />,
    status: 'available',
    category: 'content'
  }
];

const categoryColors = {
  content: 'bg-green-50 border-green-200',
  user: 'bg-purple-50 border-purple-200',
  analytics: 'bg-orange-50 border-orange-200'
};

const categoryLabels = {
  content: 'Content Management',
  user: 'User Management',
  analytics: 'Analytics & Progress'
};

const categoryBadgeColors = {
  content: 'bg-green-600 text-white border-green-600',
  user: 'bg-purple-600 text-white border-purple-600',
  analytics: 'bg-orange-600 text-white border-orange-600'
};

export function InstructorTablesManager() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  React.useEffect(() => {
    // Log that instructor tables page was accessed
    activityLogService.logSystemAction('INSTRUCTOR_TABLES_VIEW', 'Instructor tables management page accessed');
  }, []);

  const filteredTables = selectedCategory === 'all' 
    ? databaseTables 
    : databaseTables.filter(table => table.category === selectedCategory);

  const categories = ['all', 'content', 'analytics'];

  const handleTableClick = (tableName: string, status: string) => {
    if (status === 'available') {
      activityLogService.logTableAccess(tableName);
      setSelectedTable(tableName);
    }
  };

  const handleBackToTables = () => {
    setSelectedTable(null);
  };

  const handleBackToDashboard = () => {
    window.location.href = '/instructor';
  };

  // Individual table views
  if (selectedTable === 'videos') {
    return (
      <div className="space-y-6 bg-gray-50 min-h-screen p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Video Management</h1>
            <p className="text-gray-600">Manage video content for your assigned courses</p>
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

  if (selectedTable === 'modules') {
    return (
      <div className="space-y-6 bg-gray-50 min-h-screen p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Course Modules Management</h1>
            <p className="text-gray-600">Manage modules for your assigned courses</p>
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
        <InstructorModulesManager />
      </div>
    );
  }

  if (selectedTable === 'lessons') {
    return (
      <div className="space-y-6 bg-gray-50 min-h-screen p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Lessons Management</h1>
            <p className="text-gray-600">Manage lessons for your assigned courses</p>
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
        <LessonsAdminDashboard />
      </div>
    );
  }

  if (selectedTable === 'articles') {
    return (
      <div className="space-y-6 bg-gray-50 min-h-screen p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Articles Management</h1>
            <p className="text-gray-600">Manage article content for your courses</p>
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
        <ArticleAdminDashboard />
      </div>
    );
  }

  if (selectedTable === 'projects') {
    return (
      <div className="space-y-6 bg-gray-50 min-h-screen p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Project Management</h1>
            <p className="text-gray-600">Manage student projects and assignments</p>
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
        <ProjectAdminDashboard />
      </div>
    );
  }

  if (selectedTable === 'quizzes') {
    return (
      <div className="space-y-6 bg-gray-50 min-h-screen p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Quiz Management</h1>
            <p className="text-gray-600">Manage quizzes and assessments</p>
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
        <QuizAdminDashboard />
      </div>
    );
  }

  if (selectedTable === 'questions') {
    return (
      <div className="space-y-6 bg-gray-50 min-h-screen p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Quiz Questions Management</h1>
            <p className="text-gray-600">Manage quiz questions and assessments</p>
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
        <QuizQuestionAdminDashboard />
      </div>
    );
  }

  if (selectedTable === 'question_options') {
    return (
      <div className="space-y-6 bg-gray-50 min-h-screen p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Question Options Management</h1>
            <p className="text-gray-600">Manage answer options for quiz questions</p>
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
        <QuestionOptionAdminDashboard />
      </div>
    );
  }

  if (selectedTable === 'project_submissions') {
    return (
      <div className="space-y-6 bg-gray-50 min-h-screen p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Project Submissions</h1>
            <p className="text-gray-600">Review, grade, and manage student project submissions</p>
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
        <ProjectSubmissionsAdminDashboard />
      </div>
    );
  }

  // Main tables listing
  return (
    <div className="space-y-6 bg-gray-50 min-h-screen p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Content Management Tables</h1>
          <p className="text-gray-600">
            Manage content for your assigned courses. Click on available tables to access management tools.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleBackToDashboard}
          className="flex items-center space-x-2"
        >
          <span>←</span>
          <span>Back to Dashboard</span>
        </Button>
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
            className={`cursor-pointer transition-all duration-200 hover:shadow-md bg-white border border-gray-200 ${
              table.status === 'available' 
                ? 'hover:shadow-lg hover:border-blue-300' 
                : 'opacity-75 hover:opacity-90'
            }`}
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
                  className={`text-xs font-medium ${categoryBadgeColors[table.category]} border`}
                >
                  {categoryLabels[table.category]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm text-gray-600 leading-relaxed">
                {table.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Icons.Table />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Available Tables</p>
                <p className="text-2xl font-bold text-gray-900">{databaseTables.filter(t => t.status === 'available').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Icons.Book />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Content Types</p>
                <p className="text-2xl font-bold text-gray-900">{databaseTables.filter(t => t.category === 'content').length}</p>
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
            <span>How to Use Content Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2">Available Tables</h4>
              <ul className="space-y-1 text-sm">
                <li>• Click on tables marked as "Available" to access management tools</li>
                <li>• Create, edit, and manage content for your assigned courses</li>
                <li>• All content is automatically filtered to your assigned courses</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Content Management</h4>
              <ul className="space-y-1 text-sm">
                <li>• Modules: Organize course content into sections</li>
                <li>• Lessons: Create individual learning units</li>
                <li>• Videos, Articles, Projects: Add rich content to lessons</li>
                <li>• Quizzes: Create assessments and track progress</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}