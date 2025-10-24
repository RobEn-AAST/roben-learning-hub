'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lesson, LessonStats, Module } from '@/services/lessonService';
import { createClient } from '@/lib/supabase/client';
import { useLessonsAdmin, useLessonStats, useAllModules, useInstructors } from '@/hooks/useQueryCache';
import { useQueryClient } from '@tanstack/react-query';

// Icons
const Icons = {
  Video: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  Article: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Project: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  Quiz: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Edit: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  Delete: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Plus: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  ),
  Book: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  Filter: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
    </svg>
  )
};

interface LessonFormData {
  module_id: string;
  title: string;
  lesson_type: 'video' | 'article' | 'project' | 'quiz';
  position?: number;
  status: 'visible' | 'hidden';
  instructor_id: string;
  metadata?: any;
}

interface Filters {
  course_id?: string;
  module_id?: string;
  lesson_type?: string;
  status?: string;
}

export function LessonsAdminDashboard() {
  // PERFORMANCE: Use cached queries
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<Filters>({});
  const [showForm, setShowForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string; full_name?: string } | null>(null);
  const [formData, setFormData] = useState<LessonFormData>({
    module_id: '',
    title: '',
    lesson_type: 'video',
    status: 'hidden',
    instructor_id: ''
  });

  // PERFORMANCE: Cached queries with TanStack Query
  const queryClient = useQueryClient();
  const { data: lessonsData, isLoading: lessonsLoading } = useLessonsAdmin(currentPage, 10, filters);
  const { data: stats } = useLessonStats();
  const { data: modules = [], isLoading: modulesLoading } = useAllModules();
  const { data: instructors = [], isLoading: instructorsLoading } = useInstructors();

  // Extract data
  const lessons = lessonsData?.lessons || [];
  const totalPages = Math.ceil((lessonsData?.total || 0) / 10);
  const loading = lessonsLoading;

  useEffect(() => {
    loadCurrentUser();
    // PERFORMANCE: loadInitialData removed - React Query handles data fetching
  }, []);

  // PERFORMANCE: loadLessons removed - React Query auto-fetches via useLessonsAdmin hook

  const loadCurrentUser = async () => {
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, full_name')
        .eq('id', user.id)
        .single();

      if (profile) {
        setCurrentUser(profile);
        
        // Auto-assign instructor if current user is instructor
        if (profile.role === 'instructor') {
          setFormData(prev => ({ ...prev, instructor_id: profile.id }));
        }
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  // PERFORMANCE: Removed loadInitialData - React Query handles via useLessonStats, useModulesAdmin hooks

  // PERFORMANCE: Removed manual loadLessons - React Query handles data fetching via useLessonsAdmin hook

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('Submitting lesson form data:', formData);
      
      // Validate required fields before sending
      if (!formData.module_id || !formData.title || !formData.lesson_type || !formData.instructor_id) {
        toast.error('Please fill in all required fields: Module, Title, Lesson Type, and Instructor');
        return;
      }
      
      const url = editingLesson 
        ? `/api/admin/lessons/${editingLesson.id}`
        : '/api/admin/lessons';
      
      const method = editingLesson ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // Show success notification
        toast.success(editingLesson ? 'Lesson updated successfully!' : 'Lesson created successfully!');
        
        // Invalidate and refetch lessons data
        await queryClient.invalidateQueries({ queryKey: ['lessons-admin'] });
        await queryClient.invalidateQueries({ queryKey: ['lesson-stats'] });
        
        // Reset form and redirect to list view
        resetForm();
        setShowForm(false);
        setEditingLesson(null);
      } else {
        const error = await response.json();
        toast.error(error?.error || error?.message || 'Failed to save lesson');
      }
    } catch (error: any) {
      console.error('Error saving lesson:', error);
      toast.error(error?.message || 'Error saving lesson. Please try again.');
    }
  };

  const handleEdit = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setFormData({
      module_id: lesson.module_id,
      title: lesson.title,
      lesson_type: lesson.lesson_type,
      position: lesson.position,
      status: lesson.status,
      instructor_id: lesson.instructor_id,
      metadata: lesson.metadata
    });
    setShowForm(true);
  };

  const handleDelete = async (lesson: Lesson) => {
    if (!confirm(`Are you sure you want to delete "${lesson.title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/lessons/${lesson.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Lesson deleted successfully!');
        
        // Invalidate and refetch lessons data
        await queryClient.invalidateQueries({ queryKey: ['lessons-admin'] });
        await queryClient.invalidateQueries({ queryKey: ['lesson-stats'] });
      } else {
        const error = await response.json();
        toast.error(error?.error || error?.message || 'Error deleting lesson');
      }
    } catch (error: any) {
      console.error('Error deleting lesson:', error);
      toast.error(error?.message || 'Error deleting lesson. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      module_id: '',
      title: '',
      lesson_type: 'video',
      status: 'hidden',
      instructor_id: currentUser?.role === 'instructor' ? currentUser.id : ''
    });
    setEditingLesson(null);
    setShowForm(false);
  };

  const getLessonTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Icons.Video />;
      case 'article': return <Icons.Article />;
      case 'project': return <Icons.Project />;
      case 'quiz': return <Icons.Quiz />;
      default: return <Icons.Book />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      visible: 'bg-green-100 text-green-800 border-green-300',
      hidden: 'bg-yellow-100 text-yellow-800 border-yellow-300'
    } as const;
    
    return <Badge variant="outline" className={variants[status as keyof typeof variants]}>{status}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const variants = {
      video: 'bg-blue-100 text-blue-800 border-blue-300',
      article: 'bg-purple-100 text-purple-800 border-purple-300',
      project: 'bg-orange-100 text-orange-800 border-orange-300',
      quiz: 'bg-red-100 text-red-800 border-red-300'
    } as const;
    
    return <Badge variant="outline" className={variants[type as keyof typeof variants]}>{type}</Badge>;
  };

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-black">
            {editingLesson ? 'Edit Lesson' : 'Create New Lesson'}
          </h2>
          <Button variant="outline" onClick={resetForm}>
            Cancel
          </Button>
        </div>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-black">Lesson Details</CardTitle>
            <CardDescription className="text-gray-600">
              {editingLesson ? 'Update lesson information' : 'Enter lesson information'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="module_id" className="text-black">Module *</Label>
                  <select
                    id="module_id"
                    value={formData.module_id}
                    onChange={(e) => setFormData({ ...formData, module_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: 'white', color: 'black' }}
                    required
                    disabled={modulesLoading}
                  >
                    <option value="" style={{ backgroundColor: 'white', color: 'black' }}>
                      {modulesLoading ? 'Loading modules...' : modules.length === 0 ? 'No modules found' : 'Select a module'}
                    </option>
                    {modules.map((module: any) => (
                      <option key={module.id} value={module.id} style={{ backgroundColor: 'white', color: 'black' }}>
                        {module.courses?.title || 'Unknown Course'} - {module.title}
                      </option>
                    ))}
                  </select>
                  {!modulesLoading && modules.length === 0 && (
                    <p className="text-sm text-red-600">No modules found. Please create a module first.</p>
                  )}
                </div>

{/* Only show instructor selection for admins */}
                {currentUser?.role === 'admin' && (
                  <div className="space-y-2">
                    <Label htmlFor="instructor_id" className="text-black">Instructor *</Label>
                    <select
                      id="instructor_id"
                      value={formData.instructor_id}
                      onChange={(e) => setFormData({ ...formData, instructor_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ backgroundColor: 'white', color: 'black' }}
                      required
                      disabled={instructorsLoading}
                    >
                      <option value="" style={{ backgroundColor: 'white', color: 'black' }}>
                        {instructorsLoading ? 'Loading instructors...' : instructors.length === 0 ? 'No instructors found' : 'Select an instructor'}
                      </option>
                      {instructors.map((instructor: any) => (
                        <option key={instructor.id} value={instructor.id} style={{ backgroundColor: 'white', color: 'black' }}>
                          {instructor.full_name || instructor.email}
                        </option>
                      ))}
                    </select>
                    {!instructorsLoading && instructors.length === 0 && (
                      <p className="text-sm text-red-600">No instructors found. Please create an instructor user first.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title" className="text-black">Title *</Label>
                <Input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter lesson title"
                  style={{ backgroundColor: 'white', color: 'black' }}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lesson_type" className="text-black">Lesson Type *</Label>
                  <select
                    id="lesson_type"
                    value={formData.lesson_type}
                    onChange={(e) => setFormData({ ...formData, lesson_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: 'white', color: 'black' }}
                    required
                  >
                    <option value="video" style={{ backgroundColor: 'white', color: 'black' }}>Video</option>
                    <option value="article" style={{ backgroundColor: 'white', color: 'black' }}>Article</option>
                    <option value="project" style={{ backgroundColor: 'white', color: 'black' }}>Project</option>
                    <option value="quiz" style={{ backgroundColor: 'white', color: 'black' }}>Quiz</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-black">Status</Label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: 'white', color: 'black' }}
                  >
                    <option value="hidden" style={{ backgroundColor: 'white', color: 'black' }}>Hidden</option>
                    <option value="visible" style={{ backgroundColor: 'white', color: 'black' }}>Visible</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position" className="text-black">Position</Label>
                  <Input
                    id="position"
                    type="number"
                    value={formData.position || ''}
                    onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) })}
                    placeholder="Auto-assigned if empty"
                    style={{ backgroundColor: 'white', color: 'black' }}
                    min="1"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingLesson ? 'Update Lesson' : 'Create Lesson'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">Lessons Management</h1>
          <p className="text-gray-600">
            Manage all lessons - videos, articles, projects, and quizzes.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Icons.Plus />
          Add New Lesson
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Icons.Book />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Lessons</p>
                  <p className="text-2xl font-bold text-black">{stats.totalLessons}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Icons.Video />
                <div>
                  <p className="text-sm font-medium text-gray-600">Videos</p>
                  <p className="text-2xl font-bold text-black">{stats.videoLessons}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Icons.Article />
                <div>
                  <p className="text-sm font-medium text-gray-600">Articles</p>
                  <p className="text-2xl font-bold text-black">{stats.articleLessons}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Icons.Project />
                <div>
                  <p className="text-sm font-medium text-gray-600">Projects & Quizzes</p>
                  <p className="text-2xl font-bold text-black">{stats.projectLessons + stats.quizLessons}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-black flex items-center space-x-2">
            <Icons.Filter />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="filter-course" className="text-black">Course</Label>
              <select
                id="filter-course"
                value={filters.course_id || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters({ ...filters, course_id: value || undefined, module_id: undefined });
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: 'white', color: 'black' }}
              >
                <option value="" style={{ backgroundColor: 'white', color: 'black' }}>All Courses</option>
                {Array.from(new Set(modules.map((m: any) => {
                  const course = Array.isArray(m.courses) ? m.courses[0] : m.courses;
                  return course?.id;
                }))).filter(Boolean).map((courseId) => {
                  const module = modules.find((m: any) => {
                    const course = Array.isArray(m.courses) ? m.courses[0] : m.courses;
                    return course?.id === courseId;
                  });
                  const course = module ? (Array.isArray((module as any).courses) ? (module as any).courses[0] : (module as any).courses) : null;
                  return course ? (
                    <option key={course.id} value={course.id} style={{ backgroundColor: 'white', color: 'black' }}>
                      {course.title}
                    </option>
                  ) : null;
                })}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-module" className="text-black">Module</Label>
              <select
                id="filter-module"
                value={filters.module_id || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters({ ...filters, module_id: value || undefined });
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: 'white', color: 'black' }}
              >
                <option value="" style={{ backgroundColor: 'white', color: 'black' }}>All Modules</option>
                {modules
                  .filter(m => !filters.course_id || m.course_id === filters.course_id)
                  .map((module) => (
                    <option key={module.id} value={module.id} style={{ backgroundColor: 'white', color: 'black' }}>
                      {module.title}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-type" className="text-black">Type</Label>
              <select
                id="filter-type"
                value={filters.lesson_type || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters({ ...filters, lesson_type: value || undefined });
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: 'white', color: 'black' }}
              >
                <option value="" style={{ backgroundColor: 'white', color: 'black' }}>All Types</option>
                <option value="video" style={{ backgroundColor: 'white', color: 'black' }}>Video</option>
                <option value="article" style={{ backgroundColor: 'white', color: 'black' }}>Article</option>
                <option value="project" style={{ backgroundColor: 'white', color: 'black' }}>Project</option>
                <option value="quiz" style={{ backgroundColor: 'white', color: 'black' }}>Quiz</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-status" className="text-black">Status</Label>
              <select
                id="filter-status"
                value={filters.status || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters({ ...filters, status: value || undefined });
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: 'white', color: 'black' }}
              >
                <option value="" style={{ backgroundColor: 'white', color: 'black' }}>All Statuses</option>
                <option value="hidden" style={{ backgroundColor: 'white', color: 'black' }}>Hidden</option>
                <option value="visible" style={{ backgroundColor: 'white', color: 'black' }}>Visible</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lessons List */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-black">Lessons</CardTitle>
          <CardDescription className="text-gray-600">
            Manage lesson content and organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading lessons...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium text-black">Lesson Details</th>
                    <th className="text-left p-4 font-medium text-black">Course & Module</th>
                    <th className="text-left p-4 font-medium text-black">Type & Status</th>
                    {currentUser?.role === 'admin' && (
                      <th className="text-left p-4 font-medium text-black">Instructor</th>
                    )}
                    <th className="text-left p-4 font-medium text-black">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lessons.length === 0 ? (
                    <tr>
                      <td colSpan={currentUser?.role === 'admin' ? 5 : 4} className="text-center py-8 text-gray-600">
                        No lessons found.
                      </td>
                    </tr>
                  ) : (
                    lessons.map((lesson) => (
                      <tr key={lesson.id} className="border-b hover:bg-gray-50">
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            {getLessonTypeIcon(lesson.lesson_type)}
                            <div>
                              <div className="font-medium text-black">{lesson.title}</div>
                              <div className="text-sm text-gray-600">Position: {lesson.position}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div>
                            <div className="font-medium text-black">{lesson.module?.courses?.title}</div>
                            <div className="text-sm text-gray-600">{lesson.module?.title}</div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-2">
                            {getTypeBadge(lesson.lesson_type)}
                            {getStatusBadge(lesson.status)}
                          </div>
                        </td>
                        {currentUser?.role === 'admin' && (
                          <td className="p-4">
                            <div className="text-sm text-black">
                              {lesson.instructor?.full_name || 'No instructor assigned'}
                            </div>
                          </td>
                        )}
                        <td className="p-4">
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(lesson)}
                              className="flex items-center space-x-1"
                            >
                              <Icons.Edit />
                              <span>Edit</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(lesson)}
                              className="text-red-600 hover:bg-red-50 flex items-center space-x-1"
                            >
                              <Icons.Delete />
                              <span>Delete</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center space-x-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-black">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}