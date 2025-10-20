import { createClient } from '@/lib/supabase/client';

export interface PlatformAnalytics {
  // User Metrics
  totalUsers: number;
  newUsersThisMonth: number;
  activeUsersToday: number;
  userGrowthRate: number;
  
  // Course Metrics
  totalCourses: number;
  publishedCourses: number;
  coursesCreatedThisMonth: number;
  averageCourseDuration: number;
  
  // Engagement Metrics
  totalEnrollments: number;
  enrollmentsThisMonth: number;
  completionRate: number;
  averageProgressPerUser: number;
  
  // Content Metrics
  totalLessons: number;
  totalModules: number;
  totalQuizzes: number;
  totalVideos: number;
  
  // Activity Metrics
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  averageSessionsPerUser: number;
}

export interface CourseAnalytics {
  courseId: string;
  courseTitle: string;
  enrollmentCount: number;
  completionCount: number;
  completionRate: number;
  averageProgress: number;
  totalLessons: number;
  createdAt: string;
}

export interface UserEngagementData {
  date: string;
  activeUsers: number;
  newUsers: number;
  enrollments: number;
}

export interface RecentActivity {
  id: string;
  user_name: string;
  action: string;
  table_name: string;
  record_name: string;
  created_at: string;
  description: string;
}

const supabase = createClient();

export const analyticsService = {
  // Get comprehensive platform analytics using optimized API
  async getPlatformAnalytics(): Promise<PlatformAnalytics> {
    try {
      // Use the optimized API endpoint for better performance
      const response = await fetch('/api/admin/analytics', {
        method: 'GET',
        credentials: 'same-origin'
      });

      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch analytics');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching platform analytics:', error);
      
      // Fallback to direct database queries if API fails
      return this.getFallbackAnalytics();
    }
  },

  // Fallback method using direct Supabase queries
  async getFallbackAnalytics(): Promise<PlatformAnalytics> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Run essential queries only (reduced for fallback)
      const [
        usersResult,
        coursesResult,
        enrollmentsResult,
        lessonsResult
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('courses').select('*', { count: 'exact', head: true }),
        supabase.from('course_enrollments').select('*', { count: 'exact', head: true }),
        supabase.from('lessons').select('*', { count: 'exact', head: true })
      ]);

      return {
        totalUsers: usersResult.count || 0,
        newUsersThisMonth: 0,
        activeUsersToday: 0,
        userGrowthRate: 0,
        
        totalCourses: coursesResult.count || 0,
        publishedCourses: 0,
        coursesCreatedThisMonth: 0,
        averageCourseDuration: 0,
        
        totalEnrollments: enrollmentsResult.count || 0,
        enrollmentsThisMonth: 0,
        completionRate: 0,
        averageProgressPerUser: 0,
        
        totalLessons: lessonsResult.count || 0,
        totalModules: 0,
        totalQuizzes: 0,
        totalVideos: 0,
        
        dailyActiveUsers: 0,
        weeklyActiveUsers: 0,
        monthlyActiveUsers: 0,
        averageSessionsPerUser: 0
      };
    } catch (error) {
      console.error('Fallback analytics also failed:', error);
      throw error;
    }
  },

  // Get course-specific analytics
  async getCourseAnalytics(): Promise<CourseAnalytics[]> {
    try {
      const { data: courses, error } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          created_at,
          course_enrollments (count),
          modules (
            id,
            lessons (
              id,
              lesson_progress (
                id,
                status,
                progress,
                user_id
              )
            )
          )
        `)
        .eq('status', 'published');

      if (error) throw error;

      return courses?.map(course => {
        const enrollmentCount = course.course_enrollments?.length || 0;
        const totalLessons = course.modules?.reduce((acc, module) => 
          acc + (module.lessons?.length || 0), 0) || 0;
        
        // Calculate completion metrics
        const allProgress = course.modules?.flatMap(module =>
          module.lessons?.flatMap(lesson => lesson.lesson_progress || []) || []
        ) || [];
        
        const completedCount = new Set(
          allProgress
            .filter(progress => progress.status === 'completed')
            .map(progress => progress.user_id)
        ).size;
        
        const completionRate = enrollmentCount > 0 ? (completedCount / enrollmentCount) * 100 : 0;
        
        return {
          courseId: course.id,
          courseTitle: course.title,
          enrollmentCount,
          completionCount: completedCount,
          completionRate: Math.round(completionRate * 100) / 100,
          averageProgress: 0, // Would need detailed calculation
          totalLessons,
          createdAt: course.created_at
        };
      }) || [];
    } catch (error) {
      console.error('Error fetching course analytics:', error);
      throw error;
    }
  },

  // Get user engagement data for charts
  async getUserEngagementData(days: number = 30): Promise<UserEngagementData[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // This would ideally be a more complex query with date grouping
      // For now, return sample data structure
      const data: UserEngagementData[] = [];
      
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        
        // Get data for this specific date
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        
        const [activeUsersResult, newUsersResult, enrollmentsResult] = await Promise.all([
          supabase
            .from('activity_logs')
            .select('user_id')
            .gte('created_at', dayStart.toISOString())
            .lt('created_at', dayEnd.toISOString()),
          
          supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', dayStart.toISOString())
            .lt('created_at', dayEnd.toISOString()),
          
          supabase
            .from('course_enrollments')
            .select('*', { count: 'exact', head: true })
            .gte('enrolled_at', dayStart.toISOString())
            .lt('enrolled_at', dayEnd.toISOString())
        ]);
        
        data.push({
          date: date.toISOString().split('T')[0],
          activeUsers: new Set(activeUsersResult.data?.map(log => log.user_id)).size,
          newUsers: newUsersResult.count || 0,
          enrollments: enrollmentsResult.count || 0
        });
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching engagement data:', error);
      return [];
    }
  },

  // Get recent activity from logs
  async getRecentActivity(limit: number = 10): Promise<RecentActivity[]> {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          id,
          action,
          table_name,
          record_name,
          description,
          created_at,
          profiles!activity_logs_user_id_fkey (
            full_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data?.map(log => ({
        id: log.id,
        user_name: (log.profiles as any)?.full_name || 'Unknown User',
        action: log.action,
        table_name: log.table_name,
        record_name: log.record_name || '',
        created_at: log.created_at,
        description: log.description || ''
      })) || [];
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  },

  // Get Supabase database metrics (if you have access to pg_stat tables)
  async getDatabaseMetrics(): Promise<Record<string, number>> {
    try {
      // These would require database-level access or custom functions
      // For now, return basic table sizes
      const tables = ['profiles', 'courses', 'modules', 'lessons', 'course_enrollments', 'lesson_progress'];
      const metrics: Record<string, number> = {};
      
      for (const table of tables) {
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        metrics[table] = count || 0;
      }
      
      return metrics;
    } catch (error) {
      console.error('Error fetching database metrics:', error);
      return {};
    }
  }
};