import { createClient } from '@/lib/supabase/client';

export interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover_image: string | null;
  status: 'draft' | 'published' | 'archived';
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator?: { id: string; first_name: string; last_name: string } | null;
}

export interface CourseCreateData extends Omit<Course, 'id' | 'slug' | 'created_at' | 'updated_at'> {
  instructor_ids?: string[]; // Optional array of instructor IDs to assign
}

export interface CourseStats {
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  totalEnrollments: number;
  totalModules: number;
  totalLessons: number;
}

const supabase = createClient();

export const coursesService = {
  // Get all courses with pagination (uses admin API to bypass RLS)
  async getCourses(page = 1, limit = 10) {
    try {
      const apiUrl = `/api/admin/courses?page=${page}&limit=${limit}`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        credentials: 'same-origin',
      });


      if (!response.ok) {
        
        let errorData;
        try {
          const responseText = await response.text();
          errorData = JSON.parse(responseText);
        } catch (parseError) {
          console.error('🔍 getCourses: Failed to parse error response:', parseError);
          throw new Error(`API request failed (${response.status}): ${response.statusText}. This usually means you're not logged in as an admin user.`);
        }
        
        throw new Error(errorData.error || 'Failed to fetch courses');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('🔍 getCourses error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      throw error;
    }
  },

  // Get course statistics (uses admin API to bypass RLS)
  async getCourseStats(): Promise<CourseStats> {
    try {
      const response = await fetch('/api/admin/courses/stats', {
        method: 'GET',
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch course statistics');
      }

      return await response.json();
    } catch (error) {
      console.error('getCourseStats error:', error);
      throw error;
    }
  },

  // Create a new course
  // Helper function to generate slug from title
  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .trim() || 'course'; // Fallback if title results in empty string
  },

  async createCourse(courseData: CourseCreateData) {
    try {
      
      // created_by is optional — the API route sets it from the session if empty

      const response = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify(courseData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create course');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('createCourse error:', error);
      throw error;
    }
  },

  // Update a course (uses admin API to bypass RLS)
  async updateCourse(id: string, courseData: Partial<Course>) {
    try {
      const apiUrl = `/api/admin/courses/${id}`;

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify(courseData),
      });

      if (!response.ok) {
        console.error('Response not OK:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          headers: Object.fromEntries(response.headers.entries())
        });
        
        let errorData;
        let rawResponseText;
        
        try {
          // First, get the raw text to see what we're actually receiving
          rawResponseText = await response.text();
          console.error('Raw response text:', rawResponseText);
          
          // Try to parse as JSON if it's not empty
          if (rawResponseText.trim()) {
            errorData = JSON.parse(rawResponseText);
          } else {
            errorData = { error: `Empty response body (HTTP ${response.status})` };
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          console.error('Raw response was:', rawResponseText);
          errorData = { error: `Invalid JSON response (HTTP ${response.status}): ${rawResponseText}` };
        }
        
        console.error('Course update API error:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          errorData,
          rawResponseText
        });
        
        throw new Error(errorData.error || `Failed to update course (HTTP ${response.status})`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('updateCourse error:', error);
      throw error;
    }
  },

  // Delete a course (uses admin API to bypass RLS)
  async deleteCourse(id: string) {
    try {
      const response = await fetch(`/api/admin/courses/${id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete course');
      }

      return await response.json();
    } catch (error) {
      console.error('deleteCourse error:', error);
      throw error;
    }
  },

  // Get course by ID (uses admin API to bypass RLS)
  async getCourseById(id: string) {
    try {
      const response = await fetch(`/api/admin/courses/${id}`, {
        method: 'GET',
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch course');
      }

      return await response.json();
    } catch (error) {
      console.error('getCourseById error:', error);
      throw error;
    }
  },

  // Get recent activities (course creation/updates)
  async getRecentActivities(limit = 10) {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        id,
        title,
        status,
        created_at,
        updated_at,
        profiles!courses_created_by_fkey (first_name, last_name)
      `)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }
};
