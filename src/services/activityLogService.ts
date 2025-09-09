import { createClient } from '@/lib/supabase/client';

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details: string;
  metadata?: any;
  created_at: string;
}

export interface CreateActivityLogData {
  action: string;
  resource_type: string;
  resource_id?: string;
  details: string;
  metadata?: any;
}

class ActivityLogService {
  private supabase = createClient();

  // Log a new activity
  async logActivity(data: CreateActivityLogData): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      
      if (!user) {
        console.warn('Cannot log activity: No authenticated user');
        return;
      }

      const activityData = {
        user_id: user.id,
        action: data.action,
        resource_type: data.resource_type,
        resource_id: data.resource_id,
        details: data.details,
        metadata: data.metadata || {},
        created_at: new Date().toISOString()
      };

      // For now, we'll store in localStorage as a temporary solution
      // Later you can create a proper database table for this
      const existingLogs = this.getStoredLogs();
      const newLog: ActivityLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...activityData
      };
      
      const updatedLogs = [newLog, ...existingLogs].slice(0, 100); // Keep only last 100 logs
      localStorage.setItem('activity_logs', JSON.stringify(updatedLogs));

      console.log('Activity logged:', newLog);
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }

  // Get recent activity logs
  async getRecentActivities(limit: number = 10): Promise<ActivityLog[]> {
    try {
      const logs = this.getStoredLogs();
      return logs.slice(0, limit);
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
      return [];
    }
  }

  // Get stored logs from localStorage
  private getStoredLogs(): ActivityLog[] {
    try {
      const stored = localStorage.getItem('activity_logs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  // Clear all logs (for testing)
  async clearLogs(): Promise<void> {
    localStorage.removeItem('activity_logs');
  }

  // Specific logging methods for common actions
  async logCourseCreated(courseId: string, courseTitle: string): Promise<void> {
    await this.logActivity({
      action: 'CREATE',
      resource_type: 'course',
      resource_id: courseId,
      details: `Created new course: "${courseTitle}"`,
      metadata: { course_title: courseTitle }
    });
  }

  async logCourseUpdated(courseId: string, courseTitle: string, changes?: any): Promise<void> {
    await this.logActivity({
      action: 'UPDATE',
      resource_type: 'course',
      resource_id: courseId,
      details: `Updated course: "${courseTitle}"`,
      metadata: { course_title: courseTitle, changes }
    });
  }

  async logCourseDeleted(courseId: string, courseTitle: string): Promise<void> {
    await this.logActivity({
      action: 'DELETE',
      resource_type: 'course',
      resource_id: courseId,
      details: `Deleted course: "${courseTitle}"`,
      metadata: { course_title: courseTitle }
    });
  }

  async logCoursePublished(courseId: string, courseTitle: string): Promise<void> {
    await this.logActivity({
      action: 'PUBLISH',
      resource_type: 'course',
      resource_id: courseId,
      details: `Published course: "${courseTitle}"`,
      metadata: { course_title: courseTitle }
    });
  }

  async logUserLogin(userId: string): Promise<void> {
    await this.logActivity({
      action: 'LOGIN',
      resource_type: 'auth',
      resource_id: userId,
      details: 'User logged in to admin dashboard',
      metadata: { login_time: new Date().toISOString() }
    });
  }

  async logTableAccess(tableName: string): Promise<void> {
    await this.logActivity({
      action: 'VIEW',
      resource_type: 'table',
      resource_id: tableName,
      details: `Accessed table management for: ${tableName}`,
      metadata: { table_name: tableName }
    });
  }

  async logSystemAction(action: string, details: string, metadata?: any): Promise<void> {
    await this.logActivity({
      action,
      resource_type: 'system',
      details,
      metadata
    });
  }
}

export const activityLogService = new ActivityLogService();
