
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { coursesService, Course, CourseStats, CourseCreateData } from '@/services/coursesService';
import { courseInstructorService, CourseInstructor } from '../../services/courseInstructorService';
import { activityLogService } from '@/services/activityLogService';
import { createClient } from '@/lib/supabase/client';
import { 
  useCourses, 
  useCourseStats, 
  useCourseInstructors,
  useAllCourseInstructors,
  useAvailableInstructors,
  useCreateCourse,
  useUpdateCourse,
  useDeleteCourse,
  useAssignInstructor,
  useRemoveInstructor
} from '@/hooks/useQueryCache';
import { uploadImageUrlToImgbb, uploadImageFileToImgbb } from '@/lib/imgbb';

interface CourseFormData {
  title: string;
  slug?: string;
  description: string;
  cover_image: string | null;
  status: 'draft' | 'published' | 'archived';
  created_by: string;
  metadata?: Record<string, unknown>;
  instructor_ids?: string[]; // Changed to array for multiple instructors
}

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

// Instructors List Component for table display
interface InstructorsListProps {
  courseId: string;
  instructors: CourseInstructor[];
  currentUserId: string;
  onUpdate: () => void;
}

function InstructorsList({ courseId, instructors, currentUserId, onUpdate }: InstructorsListProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  
  // PERFORMANCE: Use cached query instead of manual fetching
  const { data: availableInstructors = [], isLoading: loading } = useAvailableInstructors();
  const assignInstructor = useAssignInstructor();
  const removeInstructor = useRemoveInstructor();

  const handleAssignInstructor = async (instructorId: string) => {
    try {
      await assignInstructor.mutateAsync({
        course_id: courseId,
        instructor_id: instructorId
      });
      onUpdate();
      setShowDropdown(false);
      toast.success('Instructor assigned successfully!');
      // PERFORMANCE: Cache will auto-refresh
    } catch (error) {
      toast.error(`Failed to assign instructor: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRemoveInstructor = async (instructorId: string, instructorName: string) => {
    if (!confirm(`Remove ${instructorName} as instructor?`)) return;
    
    try {
      await removeInstructor.mutateAsync({
        course_id: courseId,
        instructor_id: instructorId
      });
      
      onUpdate();
      setShowDropdown(false);
      toast.success(`${instructorName} has been removed as instructor.`);
      // PERFORMANCE: Cache will auto-refresh
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to remove instructor: ${errorMessage}`);
    }
  };

  const getAvailableForAssignment = () => {
    const assignedIds = instructors.map(i => i.instructor_id);
    return availableInstructors.filter(instructor => !assignedIds.includes(instructor.id));
  };

  return (
    <div className="min-w-[200px] relative">
      {/* Instructor Count and Dropdown Toggle */}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-700">
          {instructors.length} instructor{instructors.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-800 transition-colors"
          disabled={loading}
          title="Manage instructors"
        >
          {showDropdown ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
      </div>

      {/* Dropdown Menu */}
      {showDropdown && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[280px] max-w-[400px]">
          {/* Current Instructors */}
          {instructors.length > 0 && (
            <div className="p-3 border-b border-gray-100">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Current Instructors ({instructors.length})
              </div>
              <div className="space-y-2">
                {instructors.map((instructor) => (
                  <div key={instructor.id} className="flex items-center justify-between p-2 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {(
                            (instructor.instructor?.first_name?.charAt(0) || instructor.instructor?.last_name?.charAt(0) || '?')
                          ).toString().toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {`${instructor.instructor?.first_name || ''} ${instructor.instructor?.last_name || ''}`.trim() || 'Unknown Instructor'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {instructor.instructor?.email}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveInstructor(instructor.instructor_id, `${instructor.instructor?.first_name || ''} ${instructor.instructor?.last_name || ''}`.trim() || '')}
                      disabled={loading}
                      className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                      title="Remove instructor"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Instructors */}
          <div className="p-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Add Instructor
            </div>
            {getAvailableForAssignment().length === 0 ? (
              <div className="text-sm text-gray-400 py-3 text-center italic">
                {availableInstructors.length === 0 ? 'No instructors available' : 'All available instructors already assigned'}
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {getAvailableForAssignment().map((instructor) => (
                  <button
                    key={instructor.id}
                    onClick={() => handleAssignInstructor(instructor.id)}
                    disabled={loading}
                    className="w-full text-left p-2 hover:bg-blue-50 rounded-md disabled:opacity-50 transition-colors flex items-center space-x-3"
                  >
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-green-600">
                        {( (instructor.first_name?.charAt(0) || instructor.last_name?.charAt(0) || '?') ).toString().toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{`${instructor.first_name || ''} ${instructor.last_name || ''}`.trim() || 'Unknown Instructor'}</div>
                      <div className="text-xs text-gray-500">{instructor.email}</div>
                    </div>
                    <div className="text-blue-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface CourseTableProps {
  courses: Course[];
  courseInstructors: { [courseId: string]: CourseInstructor[] };
  currentUserId: string;
  onEdit: (course: Course) => void;
  onDelete: (courseId: string) => void;
  onView: (course: Course) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedStatus: string;
  setSelectedStatus: (value: string) => void;
  onInstructorUpdate: () => void;
}

function CourseTable({ 
  courses, 
  courseInstructors, 
  currentUserId,
  onEdit, 
  onDelete, 
  onView, 
  searchTerm, 
  setSearchTerm, 
  selectedStatus, 
  setSelectedStatus,
  onInstructorUpdate 
}: CourseTableProps) {
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
                <th className="text-left p-4 font-medium text-black">Instructors</th>
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
                    <InstructorsList 
                      courseId={course.id} 
                      instructors={courseInstructors[course.id] || []} 
                      currentUserId={currentUserId}
                      onUpdate={onInstructorUpdate}
                    />
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
  onSave: (courseData: CourseFormData) => void;
  onCancel: () => void;
  loading: boolean;
}

function CourseForm({ course, onSave, onCancel, loading }: CourseFormProps) {
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [userLoading, setUserLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [stagedBase64, setStagedBase64] = useState<string | null>(null);
  const [stagedFileName, setStagedFileName] = useState<string | null>(null);
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB limit
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [availableInstructors, setAvailableInstructors] = useState<{ id: string; first_name?: string; last_name?: string; email: string; avatar_url?: string }[]>([]);
  const [selectedInstructorIds, setSelectedInstructorIds] = useState<string[]>([]);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load available instructors and existing course instructors
  useEffect(() => {
    const loadInstructors = async () => {
      try {
        const instructors = await courseInstructorService.getAvailableInstructors();
        setAvailableInstructors(instructors);
      } catch (error) {
        console.error('Failed to load available instructors:', error);
      }
    };

    const loadExistingInstructors = async () => {
      if (course && course.id) {
        try {
          console.log('Loading existing instructors for course:', course.id);
          const existingInstructors = await courseInstructorService.getCourseInstructors(course.id);
          const instructorIds = existingInstructors.map(ci => ci.instructor_id);
          console.log('Found existing instructor IDs:', instructorIds);
          setSelectedInstructorIds(instructorIds);
        } catch (error) {
          console.error('Failed to load existing course instructors:', error);
        }
      }
    };

    loadInstructors();
    loadExistingInstructors();
  }, [course]);

  const [formData, setFormData] = useState({
    title: course?.title || '',
    slug: course?.slug || '', // Keep for display purposes, won't be sent to server
    description: course?.description || '',
    cover_image: course?.cover_image || '',
    status: course?.status || 'draft',
    created_by: course?.created_by || currentUserId
  });

  const [imgbbUploading, setImgbbUploading] = useState(false);
  const [imgbbError, setImgbbError] = useState<string | null>(null);

  // Update created_by when currentUserId is available and we're creating a new course
  useEffect(() => {
    console.log('CurrentUserId changed:', currentUserId, 'Course:', course); // Debug log
    if (currentUserId && !course) {
      console.log('Setting created_by to:', currentUserId); // Debug log
      setFormData(prev => ({ ...prev, created_by: currentUserId }));
    }
  }, [currentUserId, course]);

  // Reset form data when course changes (switching between create/edit)
  useEffect(() => {
    setFormData({
      title: course?.title || '',
      slug: course?.slug || '',
      description: course?.description || '',
      cover_image: course?.cover_image || '',
      status: course?.status || 'draft',
      created_by: course?.created_by || currentUserId
    });
    
    // Reset selected instructors when switching to create mode
    if (!course) {
      setSelectedInstructorIds([]);
    }
  }, [course, currentUserId]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Only accept imgbb / i.ibb.co direct image URLs in the cover image bar
  const isImgbbUrl = (url?: string | null) => {
    if (!url) return false;
    try {
      const u = new URL(url);
      const host = u.hostname.toLowerCase();
      return host.includes('imgbb.com') || host === 'i.ibb.co' || host === 'i.imgbb.com' || host.endsWith('ibb.co');
    } catch (e) {
      return false;
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    // If a cover image is provided, ensure it is an imgbb link
    if (formData.cover_image && formData.cover_image.trim() !== '' && !isImgbbUrl(formData.cover_image.trim())) {
      newErrors.cover_image = 'Cover image must be a direct imgbb image URL (i.ibb.co or imgbb.com)';
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
      metadata: {}, // Default empty metadata object
      instructor_ids: selectedInstructorIds // Include multiple instructors if selected
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

    // Additional immediate validation for cover_image: only allow imgbb links
    if (field === 'cover_image') {
      if (value && value.trim() !== '' && !isImgbbUrl(value.trim())) {
        setErrors(prev => ({ ...prev, cover_image: 'Only imgbb direct image URLs are allowed (i.ibb.co or imgbb.com)' }));
      } else {
        setErrors(prev => ({ ...prev, cover_image: '' }));
      }
    }
  };

  const handleUploadToImgbb = async () => {
    setImgbbError(null);
    const url = formData.cover_image?.trim();
    if (!url) {
      setImgbbError('Please provide a valid image URL first');
      return;
    }

    try {
      setImgbbUploading(true);
      const result = await uploadImageUrlToImgbb(url);
      if (!result.ok) {
        setImgbbError(result.error || 'Upload failed');
        toast.error('imgbb upload failed: ' + (result.error || 'Unknown'));
        return;
      }

      if (result.url) {
        // Update the form field so the admin sees the new URL immediately
        setFormData(prev => ({ ...prev, cover_image: result.url || '' }));

        // If we're editing an existing course, persist the new cover_image immediately
        // so the rest of the application (course lists, public pages) will use the
        // direct imgbb image URL instead of the original viewer page URL.
        if (course && course.id) {
          try {
            await coursesService.updateCourse(course.id, { cover_image: result.url });
            toast.success('Image uploaded to imgbb and saved to course');
          } catch (err: any) {
            // Persist failed; still keep the URL in the form so the admin can save later
            console.error('Failed to persist imgbb URL:', err);
            toast.error('Image uploaded but failed to save to course. Please save manually.');
          }
        } else {
          // Creating a new course: leave the value in the form and let the user save
          toast.success('Image uploaded to imgbb and URL updated (remember to save the course)');
        }
      } else {
        setImgbbError('No URL returned from imgbb');
      }
    } catch (err: any) {
      setImgbbError(err?.message || String(err));
      toast.error('imgbb upload error: ' + (err?.message || String(err)));
    } finally {
      setImgbbUploading(false);
    }
  };

  // Shared file processing (used by drop and file picker) — stage the image but don't upload yet
  const processFile = async (file: File) => {
    setImgbbError(null);
    // Accept only images
    if (!file.type.startsWith('image/')) {
      setImgbbError('Please select an image file');
      return;
    }

    // File size limit
    if (file.size > MAX_FILE_SIZE) {
      setImgbbError(`File too large. Max size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB`);
      return;
    }

    try {
      // Read file as data URL for preview and staging (no upload here)
      const reader = new FileReader();
      reader.readAsDataURL(file);
      const { base64, dataUrl } = await new Promise<{ base64: string; dataUrl: string }>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const commaIndex = result.indexOf(',');
          resolve({ base64: result.slice(commaIndex + 1), dataUrl: result });
        };
        reader.onerror = () => reject(reader.error);
      });

      // Stage preview and base64 for later upload
      setPreviewDataUrl(dataUrl);
      setStagedBase64(base64);
      setStagedFileName(file.name || 'staged-image');
    } catch (err: any) {
      setImgbbError(err?.message || String(err));
    }
  };

  // Upload the staged image to imgbb (triggered by "Use this photo")
  const uploadStagedImage = async () => {
    if (!stagedBase64) {
      setImgbbError('No image selected to upload');
      return;
    }

    try {
      setImgbbError(null);
      setImgbbUploading(true);
      const uploadRes = await uploadImageFileToImgbb(stagedBase64);
      if (!uploadRes.ok) {
        setImgbbError(uploadRes.error || 'Upload failed');
        toast.error('imgbb upload failed: ' + (uploadRes.error || 'Unknown'));
      } else if (uploadRes.url) {
        setFormData(prev => ({ ...prev, cover_image: uploadRes.url || '' }));
        if (course && course.id) {
          try {
            await coursesService.updateCourse(course.id, { cover_image: uploadRes.url });
            toast.success('Image uploaded to imgbb and saved to course');
          } catch (err: any) {
            console.error('Failed to persist imgbb URL:', err);
            toast.error('Image uploaded but failed to save to course. Please save manually.');
          }
        } else {
          toast.success('Image uploaded to imgbb and URL updated (remember to save the course)');
        }
        // clear staged data after successful upload
        setStagedBase64(null);
        setStagedFileName(null);
      }
    } catch (err: any) {
      setImgbbError(err?.message || String(err));
      toast.error('imgbb upload error: ' + (err?.message || String(err)));
    } finally {
      setImgbbUploading(false);
    }
  };

  const clearStagedImage = () => {
    setPreviewDataUrl(null);
    setStagedBase64(null);
    setStagedFileName(null);
    setImgbbError(null);
  };

  const handleInstructorToggle = (instructorId: string) => {
    setSelectedInstructorIds(prev => {
      if (prev.includes(instructorId)) {
        return prev.filter(id => id !== instructorId);
      } else {
        return [...prev, instructorId];
      }
    });
  };

  const getSelectedInstructors = () => {
    return availableInstructors.filter(instructor => selectedInstructorIds.includes(instructor.id));
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
            <div>
              <Input
                id="cover_image"
                value={formData.cover_image}
                onChange={(e) => handleInputChange('cover_image', e.target.value)}
                placeholder="https://i.ibb.co/your-image.jpg"
                type="url"
                className="text-black w-full"
              />
            </div>
            {errors.cover_image && <p className="text-sm text-red-500 mt-1">{errors.cover_image}</p>}
            <p className="text-sm text-gray-500 mt-1">
              Only direct imgbb image URLs are accepted (i.ibb.co or imgbb.com). Alternatively, drag & drop an image below or use the link to import an external URL.
            </p>

            <div className="mt-2">
              <button
                type="button"
                onClick={handleUploadToImgbb}
                disabled={imgbbUploading || !formData.cover_image}
                className="text-sm text-blue-600 hover:underline disabled:opacity-50"
              >
                Import external URL → imgbb
              </button>
            </div>

            {/* Drag & drop area (moved under the cover image bar) */}
            {/* Hidden file input for clickable drop area */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) processFile(f);
                // clear the value so same file can be re-selected later
                (e.target as HTMLInputElement).value = '';
              }}
            />

            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
              className={`mt-3 w-full h-48 flex items-center justify-center border-2 border-dashed rounded-md text-center text-gray-600 cursor-pointer transition-colors ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
              onDrop={async (e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer?.files?.[0];
                if (!file) return;
                await processFile(file);
              }}
            >
              {previewDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <div className="w-full h-full relative">
                  <div className="w-full h-full flex items-center justify-center p-2">
                    <img src={previewDataUrl} alt="preview" className="max-w-full max-h-full object-contain rounded-md shadow-sm" />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); clearStagedImage(); }}
                    onKeyDown={(e) => { e.stopPropagation(); }}
                    disabled={imgbbUploading}
                    aria-label="Remove staged image"
                    className="absolute top-2 right-2 z-20 w-7 h-7 rounded-full bg-black bg-opacity-50 text-white flex items-center justify-center hover:bg-opacity-75"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l8 8M6 14L14 6" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center pointer-events-none">
                  <svg className="w-10 h-10 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16v-4a4 4 0 014-4h2a4 4 0 014 4v4" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 20h18" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l-4-4-4 4" />
                  </svg>
                  <div className="text-sm font-medium">Drag & drop image here</div>
                  <div className="text-xs text-gray-500">or click to select a file — max 5 MB</div>
                </div>
              )}
            </div>

            {/* Actions for staged image: upload or clear */}
            {stagedBase64 && (
              <div className="mt-3 flex items-center">
                <button
                  type="button"
                  onClick={uploadStagedImage}
                  disabled={imgbbUploading}
                  className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {imgbbUploading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    'Use this photo'
                  )}
                </button>
              </div>
            )}

            {imgbbError && <p className="text-sm text-red-500 mt-1">{imgbbError}</p>}
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

          {/* Instructors - Multi-select */}
          <div>
            <Label className="text-black">Course Instructors</Label>
            
            {/* Selected Instructors Display */}
            {selectedInstructorIds.length > 0 && (
              <div className="mt-2 mb-3">
                <div className="text-sm font-medium text-gray-700 mb-2">Selected Instructors:</div>
                <div className="flex flex-wrap gap-2">
                  {getSelectedInstructors().map((instructor) => (
                    <div
                      key={instructor.id}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 border border-blue-200"
                    >
                      <span className="font-medium">{`${instructor.first_name || ''} ${instructor.last_name || ''}`.trim() || instructor.email}</span>
                      <button
                        type="button"
                        onClick={() => handleInstructorToggle(instructor.id)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Instructor Selection */}
            <div className="border border-gray-300 rounded-md max-h-48 overflow-y-auto">
              {availableInstructors.length === 0 ? (
                <div className="p-4 text-gray-500 text-center">No instructors available</div>
              ) : (
                <div className="p-2">
                  {availableInstructors.map((instructor) => (
                    <label
                      key={instructor.id}
                      className="flex items-center p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedInstructorIds.includes(instructor.id)}
                        onChange={() => handleInstructorToggle(instructor.id)}
                        className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {( (instructor.first_name?.charAt(0) || instructor.last_name?.charAt(0) || '?') ).toString().toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{`${instructor.first_name || ''} ${instructor.last_name || ''}`.trim() || instructor.email}</div>
                          <div className="text-xs text-gray-500">{instructor.email}</div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Select instructors for this course. You can add or remove instructors later.
            </p>
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
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'view' | 'edit' | 'create'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string>('');

  const coursesPerPage = 10;

  // PERFORMANCE: Use cached queries instead of manual state management
  const { 
    data: coursesData, 
    isLoading: coursesLoading, 
    error: coursesError 
  } = useCourses(currentPage, coursesPerPage, {
    status: selectedStatus || undefined,
    search: searchTerm || undefined
  });

  const { 
    data: stats, 
    isLoading: statsLoading 
  } = useCourseStats();

  // Extract data from response
  const courses = coursesData?.courses || [];
  const totalCourses = coursesData?.total || 0;
  const loading = coursesLoading || statsLoading;
  const error = coursesError ? (coursesError as Error).message : null;

  // Load ALL course instructors at once (not in a loop!)
  const { data: allCourseInstructors = [] } = useAllCourseInstructors();

  // Build instructor map from the fetched data
  const courseInstructors = courses.reduce((acc: { [courseId: string]: CourseInstructor[] }, course: Course) => {
    acc[course.id] = allCourseInstructors.filter((ci: any) => ci.course_id === course.id);
    return acc;
  }, {} as { [courseId: string]: CourseInstructor[] });

  // Get current user ID
  useEffect(() => {
    const getCurrentUserId = async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('Auth error:', error);
          return;
        }
        
        if (user && user.id) {
          setCurrentUserId(user.id);
        }
      } catch (err) {
        console.error('Error getting user:', err);
      }
    };
    getCurrentUserId();
  }, []);

  // Handle instructor updates (cache will auto-refresh)
  const handleInstructorUpdate = () => {
    // Cache automatically refreshes via mutations
  };

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
      const course = courses.find((c: Course) => c.id === courseId);
      const courseTitle = course?.title || 'Unknown Course';
      
      await coursesService.deleteCourse(courseId);
      await activityLogService.logCourseDeleted(courseId, courseTitle);
      // PERFORMANCE: Cache will auto-refresh
      toast.success('Course deleted successfully!');
    } catch (err) {
      toast.error('Failed to delete course: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleCreateNew = () => {
    setSelectedCourse(null);
    setViewMode('create');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedCourse(null);
    // PERFORMANCE: Cache will auto-refresh
  };

  const handleSaveCourse = async (courseData: CourseFormData) => {
    try {
      
      console.log('Saving course data:', courseData); // Debug log
      
      if (selectedCourse) {
        // Update existing course

        const result = await coursesService.updateCourse(selectedCourse.id, courseData);
        console.log('Update result:', result);
        
        // Detect what changed and log appropriately
        const changes = [];
        if (courseData.title && courseData.title !== selectedCourse.title) {
          changes.push(`title from "${selectedCourse.title}" to "${courseData.title}"`);
        }
        if (courseData.description && courseData.description !== selectedCourse.description) {
          changes.push(`description`);
        }
        if (courseData.status && courseData.status !== selectedCourse.status) {
          changes.push(`status from "${selectedCourse.status}" to "${courseData.status}"`);
        }
        
        const changeDescription = changes.length > 0 
          ? `Updated course ${changes.join(', ')}`
          : `Updated course: "${courseData.title || selectedCourse.title}"`;
        
        // Log the course update with detailed changes
        await activityLogService.logActivity({
          action: 'UPDATE',
          table_name: 'courses',
          record_id: selectedCourse.id,
          record_name: courseData.title || selectedCourse.title,
          description: changeDescription
        });
        
        toast.success('Course updated successfully!');
        
        // If instructor assignments were included, log the update
        if (courseData.instructor_ids && courseData.instructor_ids.length > 0) {
          console.log(`Updated course instructors: ${courseData.instructor_ids.length} instructors assigned`);
        }
      } else {
        // Create new course

        const result = await coursesService.createCourse({
          ...courseData,
          metadata: courseData.metadata || {}
        });
        console.log('Create result:', result);
        if (result?.id) {
          await activityLogService.logCourseCreated(result.id, courseData.title);
          // Note: Instructor assignments are now handled by the API automatically
        }
        toast.success('Course created successfully!');
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
          errorMessage = String((err as Record<string, unknown>).message);
        } else if ('error' in err) {
          errorMessage = String((err as Record<string, unknown>).error);
        } else {
          errorMessage = JSON.stringify(err);
        }
      }
      
      toast.error('Failed to save course: ' + errorMessage);
    }
  };

  if (loading && viewMode === 'list') {
    return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
        
        {/* Table Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-black mb-2">Description</h3>
                <p className="text-gray-600">{selectedCourse.description}</p>
              </div>
              
              {/* Course Instructors Section */}
              <div>
                <h3 className="font-medium text-black mb-3">Course Instructors</h3>
                {courseInstructors[selectedCourse.id] && courseInstructors[selectedCourse.id].length > 0 ? (
                  <div className="space-y-3">
                    {courseInstructors[selectedCourse.id].map((instructor: CourseInstructor) => (
                      <div key={instructor.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {( (instructor.instructor?.first_name?.charAt(0) || instructor.instructor?.last_name?.charAt(0) || '?') ).toString().toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {`${instructor.instructor?.first_name || ''} ${instructor.instructor?.last_name || ''}`.trim() || 'Unknown Instructor'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {instructor.instructor?.email}
                          </div>
                          <div className="text-xs text-gray-400">
                            Assigned: {new Date(instructor.assigned_at).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {instructor.role}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 italic p-3 bg-gray-50 rounded-lg">
                    No instructors assigned to this course yet.
                  </div>
                )}
              </div>
              
              {selectedCourse.cover_image && (
                <div>
                  <h3 className="font-medium text-black mb-2">Cover Image</h3>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={selectedCourse.cover_image} 
                    alt={selectedCourse.title}
                    className="rounded-lg max-w-md h-48 object-cover border border-gray-200"
                  />
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-black mb-1">Created</h3>
                  <p className="text-gray-600">
                    {new Date(selectedCourse.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-black mb-1">Last Updated</h3>
                  <p className="text-gray-600">
                    {new Date(selectedCourse.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {/* Course Statistics */}
              <div>
                <h3 className="font-medium text-black mb-3">Course Statistics</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm font-medium text-blue-600">Status</div>
                    <div className="text-lg font-semibold text-blue-900 capitalize">{selectedCourse.status}</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-sm font-medium text-green-600">Instructors</div>
                    <div className="text-lg font-semibold text-green-900">
                      {courseInstructors[selectedCourse.id]?.length || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="text-sm font-medium text-purple-600">Course ID</div>
                    <div className="text-lg font-semibold text-purple-900">
                      {selectedCourse.id.substring(0, 8)}...
                    </div>
                  </div>
                </div>
              </div>
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
        courseInstructors={courseInstructors}
        currentUserId={currentUserId}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        onInstructorUpdate={handleInstructorUpdate}
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
