
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { coursesService, Course, CourseStats } from '@/services/coursesService';
import { activityLogService } from '@/services/activityLogService';
import { createClient } from '@/lib/supabase/client';

// Icons
const Icons = {
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
  View: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  Plus: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Book: () => (
    <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  Save: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  ),
  Cancel: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
};

interface CourseTableProps {
  courses: Course[];
  onEdit: (course: Course) => void;
  onDelete: (courseId: string) => void;
  onView: (course: Course) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedStatus: string;
  setSelectedStatus: (value: string) => void;
}

function CourseTable({ courses, onEdit, onDelete, onView, searchTerm, setSearchTerm, selectedStatus, setSelectedStatus }: CourseTableProps) {
  const getStatusBadge = (status: string) => {
    const variants = {
      published: 'default',
      draft: 'secondary',
      archived: 'destructive'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>{status}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-black">Courses Management</CardTitle>
        <CardDescription className="text-gray-600">Manage all your courses</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search courses by title, description, or slug..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white text-black"
            />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4 font-medium text-black">Title</th>
                <th className="text-left p-4 font-medium text-black">Status</th>
                <th className="text-left p-4 font-medium text-black">Created</th>
                <th className="text-left p-4 font-medium text-black">Updated</th>
                <th className="text-left p-4 font-medium text-black">Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses
                .filter(course => {
                  const matchesSearch = searchTerm === '' || 
                    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    course.slug.toLowerCase().includes(searchTerm.toLowerCase());
                  const matchesStatus = selectedStatus === '' || course.status === selectedStatus;
                  return matchesSearch && matchesStatus;
                })
                .map((course) => (
                <tr key={course.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div>
                      <div className="font-medium text-black">{course.title}</div>
                      <div className="text-sm text-gray-600 truncate max-w-xs bg-white">
                        {course.description}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Slug: /{course.slug}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {getStatusBadge(course.status)}
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-black">{formatDate(course.created_at)}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-black">{formatDate(course.updated_at)}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onView(course)}
                        className="flex items-center space-x-1"
                      >
                        <Icons.View />
                        <span>View</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(course)}
                        className="flex items-center space-x-1"
                      >
                        <Icons.Edit />
                        <span>Edit</span>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onDelete(course.id)}
                        className="flex items-center space-x-1"
                      >
                        <Icons.Delete />
                        <span>Delete</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {courses
            .filter(course => {
              const matchesSearch = searchTerm === '' || 
                course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                course.slug.toLowerCase().includes(searchTerm.toLowerCase());
              const matchesStatus = selectedStatus === '' || course.status === selectedStatus;
              return matchesSearch && matchesStatus;
            }).length === 0 && courses.length > 0 && (
            <div className="text-center py-8 text-gray-500">
              No courses match your current filters. Try adjusting your search or filters.
            </div>
          )}
          {courses.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No courses found. Create your first course to get started!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function StatsCard({ title, value, icon, color }: StatsCardProps) {
  return (
    <Card className="bg-white">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-black">{value.toLocaleString()}</p>
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface CourseFormProps {
  course?: Course | null;
  onSave: (courseData: any) => void;
  onCancel: () => void;
  loading: boolean;
}

function CourseForm({ course, onSave, onCancel, loading }: CourseFormProps) {
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [userLoading, setUserLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get current user
    const getCurrentUser = async () => {
      try {
        setUserLoading(true);
        const { data: { user }, error } = await supabase.auth.getUser();
        console.log('Auth user data:', user, 'Auth error:', error); // Debug log
        
        if (error) {
          console.error('Auth error:', error);
          return;
        }
        
        if (user && user.id) {
          console.log('Setting user ID:', user.id); // Debug log
          setCurrentUserId(user.id);
        } else {
          console.log('No user found'); // Debug log
        }
      } catch (err) {
        console.error('Error getting user:', err);
      } finally {
        setUserLoading(false);
      }
    };
    getCurrentUser();
  }, []);

  const [formData, setFormData] = useState({
    title: course?.title || '',
    slug: course?.slug || '', // Keep for display purposes, won't be sent to server
    description: course?.description || '',
    cover_image: course?.cover_image || '',
    status: course?.status || 'draft',
    created_by: course?.created_by || currentUserId
  });

  // Update created_by when currentUserId is available and we're creating a new course
  useEffect(() => {
    console.log('CurrentUserId changed:', currentUserId, 'Course:', course); // Debug log
    if (currentUserId && !course) {
      console.log('Setting created_by to:', currentUserId); // Debug log
      setFormData(prev => ({ ...prev, created_by: currentUserId }));
    }
  }, [currentUserId, course]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    // Check if created_by is set for new courses (only check if user loading is complete)
    if (!course && !userLoading && (!formData.created_by || formData.created_by === '')) {
      newErrors.created_by = 'User authentication required. Please refresh and try again.';
    }

    console.log('Validation errors:', newErrors); // Debug log
    console.log('Form data during validation:', formData); // Debug log
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form data before validation:', formData); // Debug log
    
    if (!validateForm()) {
      console.log('Form validation failed'); // Debug log
      return;
    }

    const courseData = {
      title: formData.title,
      description: formData.description,
      cover_image: formData.cover_image.trim() || null,
      status: formData.status,
      created_by: formData.created_by,
      metadata: {} // Default empty metadata object
      // Note: slug is intentionally omitted - let database auto-generate it
    };

    console.log('Processed course data:', courseData); // Debug log
    onSave(courseData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Show preview slug for display purposes (not sent to server)
    if (field === 'title') {
      const previewSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim() || 'slug-will-be-generated';
      setFormData(prev => ({ ...prev, slug: previewSlug }));
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-black">
          {course ? 'Edit Course' : 'Create New Course'}
        </CardTitle>
        <CardDescription className="text-gray-600">
          {course ? 'Update course information' : 'Add a new course to your learning platform'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {userLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-600">Loading user information...</div>
          </div>
        ) : (
          <div>
            {!currentUserId && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      No active user session detected
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>Please log in to create or edit courses properly.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-black">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter course title"
              className={`text-black ${errors.title ? 'border-red-500' : ''}`}
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
          </div>

          {/* Slug - Auto-generated by database */}
          <div>
            <Label className="text-black">Slug (Auto-generated)</Label>
            <Input
              value={formData.slug || 'Will be generated from title'}
              disabled
              className="bg-gray-100 text-gray-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              URL-friendly slug will be automatically generated from the course title
            </p>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-black">Description *</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter course description"
              rows={4}
              className={`w-full px-3 py-2 border rounded-md text-black bg-white ${errors.description ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500`}
            />
            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
          </div>

          {/* Cover Image URL */}
          <div>
            <Label htmlFor="cover_image" className="text-black">Cover Image URL</Label>
            <Input
              id="cover_image"
              value={formData.cover_image}
              onChange={(e) => handleInputChange('cover_image', e.target.value)}
              placeholder="https://example.com/image.jpg"
              type="url"
              className="text-black"
            />
            <p className="text-sm text-gray-500 mt-1">
              Optional: URL to the course cover image
            </p>
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="status" className="text-black">Status</Label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>



          {/* Action Buttons */}
          <div className="flex space-x-4 pt-4">
            <Button type="submit" disabled={loading} className="flex items-center space-x-2">
              <Icons.Save />
              <span>{loading ? 'Saving...' : (course ? 'Update Course' : 'Create Course')}</span>
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              <Icons.Cancel />
              <span>Cancel</span>
            </Button>
          </div>

          {/* Show validation errors if any */}
          {errors.created_by && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-600 text-sm">{errors.created_by}</p>
            </div>
          )}
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CoursesAdminDashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<CourseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCourses, setTotalCourses] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'view' | 'edit' | 'create'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const coursesPerPage = 10;

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load courses and stats in parallel
      const [coursesResponse, statsResponse] = await Promise.all([
        coursesService.getCourses(currentPage, coursesPerPage),
        coursesService.getCourseStats()
      ]);

      setCourses(coursesResponse.courses);
      setTotalCourses(coursesResponse.total);
      setStats(statsResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentPage]);

  const handleEdit = (course: Course) => {
    setSelectedCourse(course);
    setViewMode('edit');
  };

  const handleView = (course: Course) => {
    setSelectedCourse(course);
    setViewMode('view');
  };

  const handleDelete = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }

    try {
      const course = courses.find(c => c.id === courseId);
      const courseTitle = course?.title || 'Unknown Course';
      
      await coursesService.deleteCourse(courseId);
      await activityLogService.logCourseDeleted(courseId, courseTitle);
      await loadData(); // Reload data
      alert('Course deleted successfully!');
    } catch (err) {
      alert('Failed to delete course: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleCreateNew = () => {
    setSelectedCourse(null);
    setViewMode('create');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedCourse(null);
    loadData(); // Refresh data
  };

  const handleSaveCourse = async (courseData: any) => {
    try {
      setLoading(true);
      
      console.log('Saving course data:', courseData); // Debug log
      
      if (selectedCourse) {
        // Update existing course
        console.log('Updating course with ID:', selectedCourse.id);
        const result = await coursesService.updateCourse(selectedCourse.id, courseData);
        console.log('Update result:', result);
        await activityLogService.logCourseUpdated(selectedCourse.id, courseData.title || selectedCourse.title, courseData);
        alert('Course updated successfully!');
      } else {
        // Create new course
        console.log('Creating new course');
        const result = await coursesService.createCourse(courseData);
        console.log('Create result:', result);
        if (result?.id) {
          await activityLogService.logCourseCreated(result.id, courseData.title);
        }
        alert('Course created successfully!');
      }
      
      handleBackToList();
    } catch (err) {
      console.error('Save course error:', err); // Debug log
      
      let errorMessage = 'Unknown error';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        // Handle Supabase error object
        if ('message' in err) {
          errorMessage = (err as any).message;
        } else if ('error' in err) {
          errorMessage = (err as any).error;
        } else {
          errorMessage = JSON.stringify(err);
        }
      }
      
      alert('Failed to save course: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading && viewMode === 'list') {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-lg text-black">Loading courses...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  // Create/Edit Form View
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-black">
            {viewMode === 'create' ? 'Create New Course' : 'Edit Course'}
          </h1>
          <Button onClick={handleBackToList} variant="outline">
            ← Back to List
          </Button>
        </div>
        
        <CourseForm
          course={selectedCourse}
          onSave={handleSaveCourse}
          onCancel={handleBackToList}
          loading={loading}
        />
      </div>
    );
  }

  if (viewMode === 'view' && selectedCourse) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-black">Course Details</h1>
          <Button onClick={handleBackToList} variant="outline">
            ← Back to List
          </Button>
        </div>
        
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-black">{selectedCourse.title}</CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant={selectedCourse.status === 'published' ? 'default' : 'secondary'}>
                {selectedCourse.status}
              </Badge>
              <span className="text-sm text-gray-600">Slug: /{selectedCourse.slug}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-black">Description</h3>
                <p className="text-gray-600 mt-1">{selectedCourse.description}</p>
              </div>
              
              {selectedCourse.cover_image && (
                <div>
                  <h3 className="font-medium text-black">Cover Image</h3>
                  <img 
                    src={selectedCourse.cover_image} 
                    alt={selectedCourse.title}
                    className="mt-1 rounded-lg max-w-md h-48 object-cover"
                  />
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-black">Created</h3>
                  <p className="text-gray-600 mt-1">
                    {new Date(selectedCourse.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-black">Last Updated</h3>
                  <p className="text-gray-600 mt-1">
                    {new Date(selectedCourse.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {selectedCourse.metadata && (
                <div>
                  <h3 className="font-medium text-black">Metadata</h3>
                  <pre className="text-sm bg-white border border-gray-200 p-2 rounded mt-1 text-gray-800">
                    {JSON.stringify(selectedCourse.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
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
          <h1 className="text-3xl font-bold text-black">Courses Dashboard</h1>
          <p className="text-gray-600">Manage your learning platform courses</p>
        </div>
        <Button onClick={handleCreateNew} className="flex items-center space-x-2">
          <Icons.Plus />
          <span>Create Course</span>
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Courses"
            value={stats.totalCourses}
            icon={<Icons.Book />}
            color="bg-blue-100"
          />
          <StatsCard
            title="Published"
            value={stats.publishedCourses}
            icon={<Icons.Book />}
            color="bg-green-100"
          />
          <StatsCard
            title="Draft"
            value={stats.draftCourses}
            icon={<Icons.Book />}
            color="bg-yellow-100"
          />
          <StatsCard
            title="Enrollments"
            value={stats.totalEnrollments}
            icon={<Icons.Book />}
            color="bg-purple-100"
          />
        </div>
      )}

      {/* Courses Table */}
      <CourseTable
        courses={courses}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
      />

      {/* Pagination */}
      {totalCourses > coursesPerPage && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-black">
            Page {currentPage} of {Math.ceil(totalCourses / coursesPerPage)}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={currentPage >= Math.ceil(totalCourses / coursesPerPage)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
