// Course Instructors Service
// Add this to your existing coursesService.ts or create a new instructorService.ts

import { createClient } from '@/lib/supabase/client';

export interface CourseInstructor {
  id: string;
  course_id: string;
  instructor_id: string;
  role: 'instructor'; // Only instructor role allowed
  assigned_at: string;
  assigned_by: string; // Required - must be admin
  created_at: string;
  updated_at: string;
  // Optional joined data
  instructor?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
  };
  course?: {
    id: string;
    title: string;
    slug: string;
  };
}

// Instructor profile interface
export interface InstructorProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
}

// Instructor assignment data for creation
export interface AssignInstructorData {
  course_id: string;
  instructor_id: string;
  role?: 'instructor';
  assigned_by: string; // Required - must be admin
}

const supabase = createClient();

export const courseInstructorService = {
  // Get a single course instructor assignment by ID
  async getCourseInstructor(assignment_id: string): Promise<CourseInstructor | null> {
    const { data, error } = await supabase
      .from('course_instructors')
      .select(`
        *,
        instructor:profiles!instructor_id (
          id,
          first_name,
          last_name,
          email,
          avatar_url
        ),
        course:courses!course_id (
          id,
          title,
          slug
        )
      `)
      .eq('id', assignment_id)
      .single();

    if (error) {
      console.error('Error fetching course instructor:', error);
      throw new Error(`Failed to get course instructor: ${error.message}`);
    }

    return data;
  },

  // Assign an instructor to a course (ADMIN ONLY)
  async assignInstructor(data: AssignInstructorData): Promise<CourseInstructor> {
    try {
      // Use the API endpoint which handles authentication via server actions
      const response = await fetch('/api/admin/course-instructors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          courseId: data.course_id,
          instructorId: data.instructor_id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign instructor');
      }

      const result = await response.json();
      console.log('✅ Instructor assigned successfully via API:', result);
      
      // Fetch the created assignment with joined data
      const assignment = await this.getCourseInstructor(result.id);
      if (!assignment) {
        throw new Error('Failed to fetch created assignment');
      }
      return assignment;
    } catch (error) {
      console.error('❌ API assignment failed, error:', error);
      throw error;
    }
  },

  // Remove an instructor from a course (ADMIN ONLY) - Uses server action for proper RLS handling
  async removeInstructor(course_id: string, instructor_id: string, removed_by: string): Promise<boolean> {
    console.log('🔥 REMOVE INSTRUCTOR START:', { course_id, instructor_id, removed_by });
    
    try {
      // Use the API endpoint which handles authentication via server actions
      const url = new URL('/api/admin/course-instructors', window.location.origin);
      url.searchParams.set('courseId', course_id);
      url.searchParams.set('instructorId', instructor_id);

      const response = await fetch(url.toString(), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove instructor');
      }

      const result = await response.json();
      console.log('✅ Instructor removed successfully via API:', result);
      return true;
    } catch (error) {
      console.error('❌ API removal failed, error:', error);
      throw error;
    }
    
    console.log('✅ REMOVE INSTRUCTOR SUCCESS');
    return true;
  },

  // Get all instructors for a course
  async getCourseInstructors(course_id: string): Promise<CourseInstructor[]> {
    console.log('📚 GET COURSE INSTRUCTORS for course:', course_id);
    
    try {
      const apiUrl = `/api/admin/course-instructors?type=course&courseId=${course_id}`;
      console.log('📚 Fetching from:', apiUrl);
      
      const response = await fetch(apiUrl);
      
      console.log('📚 Response status:', response.status, response.statusText);
      console.log('📚 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        // Try to get the response text to see what we're actually receiving
        const responseText = await response.text();
        console.error('📚 Error response text:', responseText.substring(0, 500)); // Log first 500 chars
        
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (parseError) {
          console.error('📚 Failed to parse error response as JSON:', parseError);
          throw new Error(`API returned HTML instead of JSON (Status: ${response.status}). This usually means the endpoint is not found or there's an authentication issue.`);
        }
        
        throw new Error(errorData.error || 'Failed to fetch course instructors');
      }
      
      const responseText = await response.text();
      console.log('📚 Success response text:', responseText.substring(0, 500));
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('📚 Failed to parse success response as JSON:', parseError);
        throw new Error('API returned HTML instead of JSON. This usually indicates a server error or authentication issue.');
      }
      
      const { instructors } = data;
      console.log(`📚 Found ${instructors?.length || 0} instructors for course ${course_id}:`, instructors);
      return instructors || [];
    } catch (error) {
      console.error('❌ Get course instructors error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to get course instructors');
    }
  },

  // Get all courses for an instructor
  async getInstructorCourses(instructor_id: string): Promise<CourseInstructor[]> {
    const { data, error } = await supabase
      .from('course_instructors')
      .select(`
        *,
        course:courses!course_id (
          id,
          title,
          slug,
          description,
          status
        )
      `)
      .eq('instructor_id', instructor_id)
      .order('assigned_at', { ascending: false });

    if (error) {
      console.error('Error getting instructor courses:', error);
      throw new Error(`Failed to get instructor courses: ${error.message}`);
    }

    return data || [];
  },

  // Check if a user can be assigned as an instructor (must have instructor role)
  async canAssignAsInstructor(user_id: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user_id)
      .single();

    if (error || !data) {
      return false;
    }

    // Only users with 'instructor' role can be assigned as instructors
    return data.role === 'instructor';
  },

  // Get all available instructors (users with instructor role)
  async getAvailableInstructors(): Promise<InstructorProfile[]> {
    try {
      const response = await fetch('/api/admin/course-instructors?type=available');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch available instructors');
      }
      
      const { instructors } = await response.json();
      // If backend still returns full_name, map to first_name/last_name
      return (instructors || []).map((inst: any) => ({
        id: inst.id,
        first_name: inst.first_name ?? '',
        last_name: inst.last_name ?? '',
        email: inst.email,
        avatar_url: inst.avatar_url
      }));
    } catch (error) {
      console.error('Error getting available instructors:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to get available instructors');
    }
  },

  // Get instructors not assigned to a specific course
  async getUnassignedInstructors(course_id: string): Promise<InstructorProfile[]> {
    // Get all instructors
    const allInstructors = await this.getAvailableInstructors();
    
    // Get currently assigned instructors for this course
    const assignedInstructors = await this.getCourseInstructors(course_id);
    const assignedIds = assignedInstructors.map(ci => ci.instructor_id);
    
    // Filter out assigned instructors
    return allInstructors.filter(instructor => !assignedIds.includes(instructor.id));
  }
};