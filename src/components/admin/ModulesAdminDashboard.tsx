'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Module, ModuleStats, Course } from '@/services/moduleService';

// Icons
const Icons = {
  Module: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
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
  Lessons: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  Search: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Filter: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
    </svg>
  )
};

interface ModuleFormData {
  course_id: string;
  title: string;
  description: string;
  position?: number;
  metadata?: any;
}

interface Filters {
  course_id?: string;
  search?: string;
}

export function ModulesAdminDashboard() {
  const [modules, setModules] = useState<Module[]>([]);
  const [stats, setStats] = useState<ModuleStats | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<Filters>({});
  const [formData, setFormData] = useState<ModuleFormData>({
    course_id: '',
    title: '',
    description: ''
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadModules();
  }, [currentPage, filters]);

  const loadInitialData = async () => {
    try {
      const [statsResponse, coursesResponse] = await Promise.all([
        fetch('/api/admin/modules/stats'),
        fetch('/api/admin/modules/courses')
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      if (coursesResponse.ok) {
        const coursesData = await coursesResponse.json();
        setCourses(coursesData);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadModules = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...filters
      });

      const response = await fetch(`/api/admin/modules?${params}`);
      if (response.ok) {
        const data = await response.json();
        setModules(data.modules);
        setTotalPages(Math.ceil(data.total / 10));
      }
    } catch (error) {
      console.error('Error loading modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingModule 
        ? `/api/admin/modules/${editingModule.id}`
        : '/api/admin/modules';
      
      const method = editingModule ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await loadModules();
        await loadInitialData();
        resetForm();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving module:', error);
      alert('Error saving module');
    }
  };

  const handleEdit = (module: Module) => {
    setEditingModule(module);
    setFormData({
      course_id: module.course_id,
      title: module.title,
      description: module.description,
      position: module.position,
      metadata: module.metadata
    });
    setShowForm(true);
  };

  const handleDelete = async (module: Module) => {
    if (!confirm(`Are you sure you want to delete "${module.title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/modules/${module.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadModules();
        await loadInitialData();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting module:', error);
      alert('Error deleting module');
    }
  };

  const resetForm = () => {
    setFormData({
      course_id: '',
      title: '',
      description: ''
    });
    setEditingModule(null);
    setShowForm(false);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      published: 'bg-green-100 text-green-800 border-green-300',
      archived: 'bg-gray-100 text-gray-800 border-gray-300'
    } as const;
    
    return <Badge variant="outline" className={variants[status as keyof typeof variants]}>{status}</Badge>;
  };

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-black">
            {editingModule ? 'Edit Module' : 'Create New Module'}
          </h2>
          <Button variant="outline" onClick={resetForm}>
            Cancel
          </Button>
        </div>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-black">Module Details</CardTitle>
            <CardDescription className="text-gray-600">
              {editingModule ? 'Update module information' : 'Enter module information'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="course_id" className="text-black">Course *</Label>
                <select
                  id="course_id"
                  value={formData.course_id}
                  onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ backgroundColor: 'white', color: 'black' }}
                  required
                  disabled={!!editingModule} // Don't allow changing course for existing modules
                >
                  <option value="" style={{ backgroundColor: 'white', color: 'black' }}>Select a course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id} style={{ backgroundColor: 'white', color: 'black' }}>
                      {course.title} ({course.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title" className="text-black">Title *</Label>
                <Input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter module title"
                  style={{ backgroundColor: 'white', color: 'black' }}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-black">Description *</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter module description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                  style={{ backgroundColor: 'white', color: 'black' }}
                  required
                />
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
                <p className="text-sm text-gray-600">
                  Position determines the order of modules in the course (1 = first)
                </p>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingModule ? 'Update Module' : 'Create Module'}
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
          <h1 className="text-3xl font-bold tracking-tight text-black">Course Modules Management</h1>
          <p className="text-gray-600">
            Organize course content into modules for better structure and learning flow.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Icons.Plus />
          Add New Module
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Icons.Module />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Modules</p>
                  <p className="text-2xl font-bold text-black">{stats.totalModules}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Icons.Book />
                <div>
                  <p className="text-sm font-medium text-gray-600">Courses with Modules</p>
                  <p className="text-2xl font-bold text-black">{Object.keys(stats.modulesByCourse).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Icons.Lessons />
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
                <Icons.Module />
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Lessons/Module</p>
                  <p className="text-2xl font-bold text-black">{stats.averageLessonsPerModule}</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="filter-course" className="text-black">Course</Label>
              <select
                id="filter-course"
                value={filters.course_id || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters({ ...filters, course_id: value || undefined });
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: 'white', color: 'black' }}
              >
                <option value="" style={{ backgroundColor: 'white', color: 'black' }}>All Courses</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id} style={{ backgroundColor: 'white', color: 'black' }}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-search" className="text-black">Search</Label>
              <div className="relative">
                <Icons.Search />
                <Input
                  id="filter-search"
                  type="text"
                  value={filters.search || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFilters({ ...filters, search: value || undefined });
                    setCurrentPage(1);
                  }}
                  placeholder="Search modules by title or description..."
                  className="pl-10"
                  style={{ backgroundColor: 'white', color: 'black' }}
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Icons.Search />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modules List */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-black">Modules</CardTitle>
          <CardDescription className="text-gray-600">
            Manage course modules and their organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading modules...</p>
            </div>
          ) : modules.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No modules found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {modules.map((module) => (
                <div key={module.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <Icons.Module />
                        <h3 className="text-lg font-semibold text-black truncate">{module.title}</h3>
                        {module.course?.status && getStatusBadge(module.course.status)}
                        <Badge variant="outline">Position {module.position}</Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          <strong>Course:</strong> {module.course?.title}
                        </p>
                        <p>
                          <strong>Description:</strong> {module.description}
                        </p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="flex items-center space-x-1">
                            <Icons.Lessons />
                            <span>{module.lessons_count || 0} lesson(s)</span>
                          </span>
                          <span className="text-xs text-gray-500">
                            Created: {new Date(module.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(module)}
                      >
                        <Icons.Edit />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(module)}
                      >
                        <Icons.Delete />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
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