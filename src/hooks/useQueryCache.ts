/**
 * PERFORMANCE OPTIMIZATION: React Query Hooks
 * 
 * Purpose: Reduce redundant API calls by 70% through intelligent caching
 * 
 * Before: Every component fetch = new API call
 * After: Cache hits = no API call (instant response)
 * 
 * Expected improvements:
 * - 70% fewer API calls
 * - Instant page transitions (cached data)
 * - Automatic background updates
 * - Optimistic updates for better UX
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { coursesService, type Course, type CourseStats } from '@/services/coursesService';
import { courseInstructorService, type CourseInstructor } from '@/services/courseInstructorService';
import { moduleService, type Module, type ModuleStats } from '@/services/moduleService';
import { lessonService, type Lesson, type LessonStats } from '@/services/lessonService';

const supabase = createClient();

// ============================================================================
// QUERY KEYS - Centralized cache key management
// ============================================================================
export const queryKeys = {
  courses: {
    all: ['courses'] as const,
    lists: () => [...queryKeys.courses.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.courses.lists(), filters] as const,
    details: () => [...queryKeys.courses.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.courses.details(), id] as const,
  },
  modules: {
    all: ['modules'] as const,
    lists: () => [...queryKeys.modules.all, 'list'] as const,
    list: (courseId?: string) => [...queryKeys.modules.lists(), { courseId }] as const,
    details: () => [...queryKeys.modules.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.modules.details(), id] as const,
  },
  lessons: {
    all: ['lessons'] as const,
    lists: () => [...queryKeys.lessons.all, 'list'] as const,
    list: (moduleId?: string) => [...queryKeys.lessons.lists(), { moduleId }] as const,
    details: () => [...queryKeys.lessons.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.lessons.details(), id] as const,
  },
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    enrollments: () => [...queryKeys.user.all, 'enrollments'] as const,
    progress: () => [...queryKeys.user.all, 'progress'] as const,
  },
};

// ============================================================================
// COURSE QUERIES
// ============================================================================

// Get all courses with caching + pagination
export function useCourses(page = 1, limit = 10, filters?: { status?: string; search?: string }) {
  return useQuery({
    queryKey: queryKeys.courses.list({ page, limit, ...filters }),
    queryFn: async () => {
      // Use API endpoint directly to support filters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.search && { search: filters.search }),
      });
      
      const response = await fetch(`/api/admin/courses?${params}`, {
        method: 'GET',
        credentials: 'same-origin',
      });
      
      if (!response.ok) throw new Error('Failed to fetch courses');
      return await response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (admin data changes more frequently)
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

// Get course stats with caching
export function useCourseStats() {
  return useQuery({
    queryKey: ['course-stats'],
    queryFn: async () => {
      return await coursesService.getCourseStats();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get course instructors with caching
export function useCourseInstructors(courseId: string) {
  return useQuery({
    queryKey: ['course-instructors', courseId],
    queryFn: async () => {
      return await courseInstructorService.getCourseInstructors(courseId);
    },
    enabled: !!courseId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

// Get ALL course instructors (for admin dashboard)
export function useAllCourseInstructors() {
  return useQuery({
    queryKey: ['all-course-instructors'],
    queryFn: async () => {
      // Fetch all course instructors at once
      const response = await fetch('/api/admin/course-instructors?type=all');
      if (!response.ok) throw new Error('Failed to fetch course instructors');
      return await response.json();
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

// Get available instructors with caching
export function useAvailableInstructors() {
  return useQuery({
    queryKey: ['available-instructors'],
    queryFn: async () => {
      return await courseInstructorService.getAvailableInstructors();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get single course with caching
export function useCourse(courseId: string | null) {
  return useQuery({
    queryKey: courseId ? queryKeys.courses.detail(courseId) : ['courses', 'empty'],
    queryFn: async () => {
      if (!courseId) return null;
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId, // Only run if courseId exists
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// MODULE QUERIES
// ============================================================================

// Get modules by course with caching
export function useModules(courseId?: string) {
  return useQuery({
    queryKey: queryKeys.modules.list(courseId),
    queryFn: async () => {
      let query = supabase
        .from('modules')
        .select('*')
        .order('position', { ascending: true });

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Get single module with caching
export function useModule(moduleId: string | null) {
  return useQuery({
    queryKey: moduleId ? queryKeys.modules.detail(moduleId) : ['modules', 'empty'],
    queryFn: async () => {
      if (!moduleId) return null;
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('id', moduleId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!moduleId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// LESSON QUERIES
// ============================================================================

// Get lessons by module with caching
export function useLessons(moduleId?: string) {
  return useQuery({
    queryKey: queryKeys.lessons.list(moduleId),
    queryFn: async () => {
      let query = supabase
        .from('lessons')
        .select('*')
        .order('position', { ascending: true });

      if (moduleId) {
        query = query.eq('module_id', moduleId);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// USER QUERIES
// ============================================================================

// Get current user profile with caching
export function useUserProfile() {
  return useQuery({
    queryKey: queryKeys.user.profile(),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - profile changes infrequently
  });
}

// Get user enrollments with caching
export function useUserEnrollments() {
  return useQuery({
    queryKey: queryKeys.user.enrollments(),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('course_enrollments')
        .select('*, courses(*)')
        .eq('user_id', user.id);

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// MODULE & LESSON ADMIN QUERIES
// ============================================================================

// Get modules with stats
export function useModulesAdmin(page = 1, limit = 10, filters?: { course_id?: string }) {
  return useQuery({
    queryKey: ['modules-admin', page, limit, filters],
    queryFn: async () => {
      return await moduleService.getModules(page, limit, filters);
    },
    staleTime: 2 * 60 * 1000,
  });
}

// Get module stats
export function useModuleStats() {
  return useQuery({
    queryKey: ['module-stats'],
    queryFn: async () => {
      return await moduleService.getModuleStats();
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Get lessons with pagination
export function useLessonsAdmin(page = 1, limit = 10, filters?: { module_id?: string; course_id?: string }) {
  return useQuery({
    queryKey: ['lessons-admin', page, limit, filters],
    queryFn: async () => {
      return await lessonService.getLessons(page, limit, filters);
    },
    staleTime: 2 * 60 * 1000,
  });
}

// Get lesson stats
export function useLessonStats() {
  return useQuery({
    queryKey: ['lesson-stats'],
    queryFn: async () => {
      return await lessonService.getLessonStats();
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Get all users (for admin)
export function useUsersAdmin(page = 1, limit = 50, filters?: { role?: string }) {
  return useQuery({
    queryKey: ['users-admin', page, limit, filters],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (filters?.role) {
        query = query.eq('role', filters.role);
      }

      const offset = (page - 1) * limit;
      const { data, error, count } = await query.range(offset, offset + limit - 1);
      
      if (error) throw error;
      return { users: data || [], total: count || 0 };
    },
    staleTime: 2 * 60 * 1000,
  });
}

// ============================================================================
// MUTATIONS - Optimistic updates
// ============================================================================

// Create course with optimistic update
export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseData: Partial<Course> & { title: string; description: string }) => {
      return await coursesService.createCourse(courseData as any);
    },
    onMutate: async (newCourse) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.courses.all });
      
      // Snapshot previous value
      const previousCourses = queryClient.getQueryData(queryKeys.courses.lists());
      
      // Optimistically add new course to cache
      queryClient.setQueryData(queryKeys.courses.list({ page: 1, limit: 10 }), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          courses: [{ ...newCourse, id: 'temp-' + Date.now(), status: 'draft' }, ...(old.courses || [])],
          total: (old.total || 0) + 1,
        };
      });
      
      return { previousCourses };
    },
    onError: (err, newCourse, context) => {
      // Rollback on error
      if (context?.previousCourses) {
        queryClient.setQueryData(queryKeys.courses.lists(), context.previousCourses);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
      queryClient.invalidateQueries({ queryKey: ['course-stats'] });
    },
  });
}

// Update course with optimistic update
export function useUpdateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Course> }) => {
      return await coursesService.updateCourse(id, updates as any);
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.courses.all });
      
      // Snapshot previous value
      const previousCourses = queryClient.getQueryData(queryKeys.courses.lists());
      
      // Optimistically update cache
      queryClient.setQueriesData({ queryKey: queryKeys.courses.lists() }, (old: any) => {
        if (!old || !old.courses) return old;
        return {
          ...old,
          courses: old.courses.map((course: any) =>
            course.id === id ? { ...course, ...updates } : course
          ),
        };
      });
      
      return { previousCourses };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousCourses) {
        queryClient.setQueryData(queryKeys.courses.lists(), context.previousCourses);
      }
    },
    onSuccess: (data: Course) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: ['course-stats'] });
    },
  });
}

// Delete course with optimistic update
export function useDeleteCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseId: string) => {
      return await coursesService.deleteCourse(courseId);
    },
    onMutate: async (courseId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.courses.all });
      
      // Snapshot previous value
      const previousCourses = queryClient.getQueryData(queryKeys.courses.lists());
      
      // Optimistically remove course from cache
      queryClient.setQueriesData({ queryKey: queryKeys.courses.lists() }, (old: any) => {
        if (!old || !old.courses) return old;
        return {
          ...old,
          courses: old.courses.filter((course: any) => course.id !== courseId),
          total: Math.max(0, (old.total || 0) - 1),
        };
      });
      
      return { previousCourses };
    },
    onError: (err, courseId, context) => {
      // Rollback on error
      if (context?.previousCourses) {
        queryClient.setQueryData(queryKeys.courses.lists(), context.previousCourses);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
      queryClient.invalidateQueries({ queryKey: ['course-stats'] });
    },
  });
}

// Assign instructor to course
export function useAssignInstructor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ course_id, instructor_id, assigned_by }: { course_id: string; instructor_id: string; assigned_by?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      return await courseInstructorService.assignInstructor({ 
        course_id, 
        instructor_id,
        assigned_by: assigned_by || user?.id || ''
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['course-instructors', variables.course_id] });
    },
  });
}

// Remove instructor from course
export function useRemoveInstructor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ course_id, instructor_id }: { course_id: string; instructor_id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      return await courseInstructorService.removeInstructor(course_id, instructor_id, user?.id || '');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['course-instructors', variables.course_id] });
    },
  });
}

// Example: Optimistic update for better UX
export function useCreateModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newModule: Record<string, unknown>) => {
      const { data, error } = await supabase
        .from('modules')
        .insert(newModule)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newModule) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.modules.all });

      // Snapshot previous value
      const previousModules = queryClient.getQueryData(queryKeys.modules.lists());

      // Optimistically update cache
      queryClient.setQueryData(queryKeys.modules.list(newModule.course_id as string), (old: unknown[] = []) => [
        ...old,
        { ...newModule, id: 'temp-id' },
      ]);

      return { previousModules };
    },
    onError: (err, newModule, context) => {
      // Rollback on error
      if (context?.previousModules) {
        queryClient.setQueryData(queryKeys.modules.lists(), context.previousModules);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.modules.all });
    },
  });
}

// ============================================================================
// STUDENT-FACING QUERIES - Landing Page, Course Catalog, Learning
// ============================================================================

// Landing page data with caching
export function useLandingPageData() {
  return useQuery({
    queryKey: ['landing-page'],
    queryFn: async () => {
      const response = await fetch('/api/landing');
      if (!response.ok) throw new Error('Failed to fetch landing data');
      return await response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - landing page changes infrequently
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}

// Public course catalog with caching
export function usePublicCourses(filters?: { search?: string; status?: string }) {
  return useQuery({
    queryKey: ['public-courses', filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        status: 'published',
        ...(filters?.search && { search: filters.search }),
      });
      
      const response = await fetch(`/api/courses?${params}`);
      if (!response.ok) throw new Error('Failed to fetch courses');
      return await response.json();
    },
    staleTime: 3 * 60 * 1000, // 3 minutes - course catalog changes occasionally
    gcTime: 10 * 60 * 1000,
  });
}

// Single course detail with enrollment status
export function useCourseDetail(courseId: string) {
  return useQuery({
    queryKey: ['course-detail', courseId],
    queryFn: async () => {
      const response = await fetch(`/api/courses/${courseId}`);
      if (!response.ok) throw new Error('Failed to fetch course');
      return await response.json();
    },
    enabled: !!courseId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
  });
}

// User's enrolled courses with progress
export function useMyEnrolledCourses() {
  return useQuery({
    queryKey: ['my-enrolled-courses'],
    queryFn: async () => {
      const response = await fetch('/api/student/enrollments');
      if (!response.ok) throw new Error('Failed to fetch enrollments');
      return await response.json();
    },
    staleTime: 1 * 60 * 1000, // 1 minute - progress changes frequently
    gcTime: 5 * 60 * 1000,
  });
}

// Course learning data (modules, lessons, progress)
export function useCourseLearningData(courseId: string) {
  return useQuery({
    queryKey: ['course-learning', courseId],
    queryFn: async () => {
      const response = await fetch(`/api/courses/${courseId}`);
      if (!response.ok) throw new Error('Failed to fetch course learning data');
      return await response.json();
    },
    enabled: !!courseId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
  });
}

// Lesson progress tracking
export function useLessonProgress(courseId: string) {
  return useQuery({
    queryKey: ['lesson-progress', courseId],
    queryFn: async () => {
      const response = await fetch(`/api/courses/${courseId}/progress`);
      if (!response.ok) throw new Error('Failed to fetch progress');
      return await response.json();
    },
    enabled: !!courseId,
    staleTime: 30 * 1000, // 30 seconds - progress updates frequently
    gcTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// STUDENT MUTATIONS - Enrollment, Progress, Completion
// ============================================================================

// Enroll in course with optimistic update
export function useEnrollCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseId: string) => {
      const response = await fetch(`/api/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to enroll');
      return await response.json();
    },
    onMutate: async (courseId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['course-detail', courseId] });
      await queryClient.cancelQueries({ queryKey: ['my-enrolled-courses'] });

      // Snapshot previous value
      const previousCourseDetail = queryClient.getQueryData(['course-detail', courseId]);

      // Optimistically update to enrolled
      queryClient.setQueryData(['course-detail', courseId], (old: any) => ({
        ...old,
        isEnrolled: true,
      }));

      return { previousCourseDetail };
    },
    onError: (err, courseId, context) => {
      // Rollback on error
      if (context?.previousCourseDetail) {
        queryClient.setQueryData(['course-detail', courseId], context.previousCourseDetail);
      }
    },
    onSuccess: (data, courseId) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['course-detail', courseId] });
      queryClient.invalidateQueries({ queryKey: ['my-enrolled-courses'] });
      queryClient.invalidateQueries({ queryKey: ['landing-page'] });
    },
  });
}

// Mark lesson complete with optimistic update
export function useMarkLessonComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseId, lessonId }: { courseId: string; lessonId: string }) => {
      const response = await fetch(`/api/courses/${courseId}/lessons/${lessonId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to mark complete');
      return await response.json();
    },
    onMutate: async ({ courseId, lessonId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['lesson-progress', courseId] });

      // Snapshot previous value
      const previousProgress = queryClient.getQueryData(['lesson-progress', courseId]);

      // Optimistically update progress
      queryClient.setQueryData(['lesson-progress', courseId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          completedLessons: [...(old.completedLessons || []), lessonId],
          completedLessonsCount: (old.completedLessonsCount || 0) + 1,
          percentage: Math.min(100, ((old.completedLessonsCount || 0) + 1) / (old.totalLessons || 1) * 100),
        };
      });

      return { previousProgress };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousProgress) {
        queryClient.setQueryData(['lesson-progress', variables.courseId], context.previousProgress);
      }
    },
    onSuccess: (data, { courseId }) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['lesson-progress', courseId] });
      queryClient.invalidateQueries({ queryKey: ['course-learning', courseId] });
      queryClient.invalidateQueries({ queryKey: ['my-enrolled-courses'] });
    },
  });
}

// ============================================================================
// ADMIN: PROJECTS
// ============================================================================

export function useProjects() {
  return useQuery({
    queryKey: ['projects', 'admin'],
    queryFn: async () => {
      const response = await fetch('/api/admin/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      return await response.json();
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

export function useProjectLessons() {
  return useQuery({
    queryKey: ['project-lessons', 'admin'],
    queryFn: async () => {
      const response = await fetch('/api/admin/projects/lessons');
      if (!response.ok) throw new Error('Failed to fetch project lessons');
      return await response.json();
    },
    staleTime: 3 * 60 * 1000,
  });
}

export function useProjectStats() {
  return useQuery({
    queryKey: ['project-stats', 'admin'],
    queryFn: async () => {
      const response = await fetch('/api/admin/projects/stats');
      if (!response.ok) throw new Error('Failed to fetch project stats');
      return await response.json();
    },
    staleTime: 5 * 60 * 1000, // Stats change less frequently
  });
}

// ============================================================================
// ADMIN: QUIZZES
// ============================================================================

export function useQuizzes() {
  return useQuery({
    queryKey: ['quizzes', 'admin'],
    queryFn: async () => {
      const response = await fetch('/api/admin/quizzes');
      if (!response.ok) throw new Error('Failed to fetch quizzes');
      return await response.json();
    },
    staleTime: 3 * 60 * 1000,
  });
}

export function useQuizLessons() {
  return useQuery({
    queryKey: ['quiz-lessons', 'admin'],
    queryFn: async () => {
      const response = await fetch('/api/admin/quizzes/lessons');
      if (!response.ok) throw new Error('Failed to fetch quiz lessons');
      return await response.json();
    },
    staleTime: 3 * 60 * 1000,
  });
}

export function useQuizStats() {
  return useQuery({
    queryKey: ['quiz-stats', 'admin'],
    queryFn: async () => {
      const response = await fetch('/api/admin/quizzes/stats');
      if (!response.ok) throw new Error('Failed to fetch quiz stats');
      return await response.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// ADMIN: QUIZ QUESTIONS
// ============================================================================

export function useQuizQuestions() {
  return useQuery({
    queryKey: ['quiz-questions', 'admin'],
    queryFn: async () => {
      const response = await fetch('/api/admin/quiz-questions');
      if (!response.ok) throw new Error('Failed to fetch quiz questions');
      return await response.json();
    },
    staleTime: 3 * 60 * 1000,
  });
}

export function useQuestionQuizzes() {
  return useQuery({
    queryKey: ['question-quizzes', 'admin'],
    queryFn: async () => {
      const response = await fetch('/api/admin/quiz-questions/quizzes');
      if (!response.ok) throw new Error('Failed to fetch question quizzes');
      return await response.json();
    },
    staleTime: 3 * 60 * 1000,
  });
}

export function useQuestionStats() {
  return useQuery({
    queryKey: ['question-stats', 'admin'],
    queryFn: async () => {
      const response = await fetch('/api/admin/quiz-questions/stats');
      if (!response.ok) throw new Error('Failed to fetch question stats');
      return await response.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// ADMIN: VIDEOS
// ============================================================================

export function useVideos() {
  return useQuery({
    queryKey: ['videos', 'admin'],
    queryFn: async () => {
      const response = await fetch('/api/admin/videos');
      if (!response.ok) throw new Error('Failed to fetch videos');
      return await response.json();
    },
    staleTime: 3 * 60 * 1000,
  });
}

export function useVideoLessons() {
  return useQuery({
    queryKey: ['video-lessons', 'admin'],
    queryFn: async () => {
      const response = await fetch('/api/admin/videos/lessons');
      if (!response.ok) throw new Error('Failed to fetch video lessons');
      return await response.json();
    },
    staleTime: 3 * 60 * 1000,
  });
}

export function useVideoStats() {
  return useQuery({
    queryKey: ['video-stats', 'admin'],
    queryFn: async () => {
      const response = await fetch('/api/admin/videos/stats');
      if (!response.ok) throw new Error('Failed to fetch video stats');
      return await response.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// ADMIN: ACTIVITY LOGS
// ============================================================================

export function useActivityLogs(filters: { page?: number; limit?: number; action?: string; tableName?: string; search?: string } = {}) {
  const { page = 1, limit = 50, action, tableName, search } = filters;
  
  return useQuery({
    queryKey: ['activity-logs', 'admin', { page, limit, action, tableName, search }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(action && { action }),
        ...(tableName && { tableName }),
        ...(search && { search }),
      });
      const response = await fetch(`/api/admin/logs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch activity logs');
      return await response.json();
    },
    staleTime: 1 * 60 * 1000, // 1 minute - logs change frequently
    placeholderData: (previousData: any) => previousData, // Keep previous page while loading next page
  });
}

// ============================================================================
// INSTRUCTOR: DASHBOARD
// ============================================================================

export function useInstructorDashboard() {
  return useQuery({
    queryKey: ['instructor-dashboard'],
    queryFn: async () => {
      const response = await fetch('/api/instructor/dashboard');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load dashboard data');
      }
      return await response.json();
    },
    staleTime: 3 * 60 * 1000, // 3 minutes - dashboard data doesn't change frequently
  });
}

export function useInstructorCourses() {
  return useQuery({
    queryKey: ['instructor-courses'],
    queryFn: async () => {
      const response = await fetch('/api/instructor/courses');
      if (!response.ok) throw new Error('Failed to fetch instructor courses');
      return await response.json();
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}
