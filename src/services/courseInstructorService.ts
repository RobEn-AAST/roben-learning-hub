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
    full_name: string;
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
  full_name: string;
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
          full_name,
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
    // Verify that the user performing this action is admin
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.assigned_by)
      .single();

    if (userError || !userData) {
      console.error('Error checking user role:', userError);
      throw new Error('User not found or unauthorized');
    }

    if (userData.role !== 'admin') {
      throw new Error('Only admins can assign instructors to courses');
    }
    
    // Check if assignment already exists
    const { data: existingAssignment, error: checkError } = await supabase
      .from('course_instructors')
      .select('id')
      .eq('course_id', data.course_id)
      .eq('instructor_id', data.instructor_id)
      .maybeSingle();
      
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing assignment:', checkError);
      throw new Error(`Error checking existing assignment: ${checkError.message}`);
    }
    
    if (existingAssignment) {
      throw new Error('Instructor is already assigned to this course');
    }
    
    // Create new assignment
    const { data: insertData, error: insertError } = await supabase
      .from('course_instructors')
      .insert([{
        course_id: data.course_id,
        instructor_id: data.instructor_id,
        role: data.role || 'instructor',
        assigned_by: data.assigned_by,
        assigned_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select('id')
      .single();
        
    if (insertError) {
      console.error('Error creating assignment:', insertError);
      throw new Error(`Failed to assign instructor: ${insertError.message}`);
    }

    // Fetch the created assignment with joined data
    const result = await this.getCourseInstructor(insertData.id);
    if (!result) {
      throw new Error('Failed to fetch created assignment');
    }
    return result;
  },

  // Remove an instructor from a course (ADMIN ONLY) - HARD DELETE
  async removeInstructor(course_id: string, instructor_id: string, removed_by: string): Promise<boolean> {
    console.log('🔥 REMOVE INSTRUCTOR START:', { course_id, instructor_id, removed_by });
    
    // Verify admin permissions
    console.log('🔍 Checking admin permissions...');
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id, role, full_name, email')
      .eq('id', removed_by)
      .single();

    if (userError || !userData) {
      console.error('❌ User check failed:', userError);
      throw new Error('User not found or unauthorized');
    }

    console.log('👤 User performing removal:', userData);
    
    if (userData.role !== 'admin') {
      throw new Error('Only admins can remove instructors from courses');
    }
    
    // Find the existing assignment
    console.log('🔍 Looking for existing assignment...');
    const { data: existingAssignment, error: checkError } = await supabase
      .from('course_instructors')
      .select('id, course_id, instructor_id, assigned_at')
      .eq('course_id', course_id)
      .eq('instructor_id', instructor_id)
      .single();
      
    if (checkError) {
      console.error('❌ Assignment search failed:', checkError);
      throw new Error(`Error checking assignment: ${checkError.message}`);
    }
    
    console.log('📋 Assignment search result:', existingAssignment);
    
    if (!existingAssignment) {
      console.log('❌ No assignment found at all');
      throw new Error('No instructor assignment found for this course');
    }
    
    // Hard delete the assignment record completely
    console.log('🗑️ Deleting assignment record permanently...');
    const deleteResult = await supabase
      .from('course_instructors')
      .delete()
      .eq('id', existingAssignment.id)
      .select('*');

    console.log('💾 Database delete result:', deleteResult);
    
    if (deleteResult.error) {
      console.error('❌ Database delete failed:', deleteResult.error);
      throw new Error(`Failed to delete instructor: ${deleteResult.error.message}`);
    }

    if (!deleteResult.data || deleteResult.data.length === 0) {
      console.error('❌ No rows deleted');
      throw new Error('Failed to delete instructor assignment');
    }
    
    console.log('✅ Successfully deleted assignment:', deleteResult.data[0]);
    
    // Verify the deletion by checking if record still exists
    console.log('🔍 Verifying the deletion...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('course_instructors')
      .select('id')
      .eq('id', existingAssignment.id)
      .single();
      
    if (verifyError && verifyError.code === 'PGRST116') {
      // PGRST116 = no rows found, which means deletion was successful
      console.log('✅ Deletion verified - record no longer exists');
    } else if (verifyError) {
      console.error('❌ Verification query failed:', verifyError);
    } else if (verifyData) {
      console.error('🚨 WARNING: Assignment still exists after deletion!');
      throw new Error('Database deletion failed - assignment still exists');
    }
    
    console.log('✅ REMOVE INSTRUCTOR SUCCESS');
    return true;
  },

  // Get all instructors for a course
  async getCourseInstructors(course_id: string): Promise<CourseInstructor[]> {
    console.log('📚 GET COURSE INSTRUCTORS for course:', course_id);
    
    const { data, error } = await supabase
      .from('course_instructors')
      .select(`
        *,
        instructor:profiles!instructor_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('course_id', course_id)
      .order('assigned_at', { ascending: true });

    if (error) {
      console.error('❌ Get course instructors error:', error);
      throw new Error(`Failed to get course instructors: ${error.message}`);
    }

    console.log(`📚 Found ${data?.length || 0} instructors for course ${course_id}:`, data);
    return data || [];
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
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .eq('role', 'instructor')
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Error getting available instructors:', error);
      throw new Error(`Failed to get available instructors: ${error.message}`);
    }

    return data || [];
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