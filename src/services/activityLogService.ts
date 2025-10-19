import { createClient } from '@/lib/supabase/client';

export interface ActivityLog {
  id: string;
  user_name: string;
  action: string;
  table_name: string;
  record_name?: string;
  description: string;
  created_at: string;
}

export interface CreateActivityLogData {
  action: string;
  table_name: string;
  record_id?: string;
  record_name?: string;
  description: string;
  old_values?: string;
  new_values?: string;
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

      // Get user profile to get the full name
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const user_name = profile?.full_name || 'Unknown User';

      const logData = {
        user_id: user.id,
        user_name,
        action: data.action,
        table_name: data.table_name,
        record_id: data.record_id,
        record_name: data.record_name || null,
        description: data.description,
        old_values: data.old_values,
        new_values: data.new_values
      };

      // Send to database via API
      const response = await fetch('/api/admin/activity-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(logData)
      });

      if (!response.ok) {
        console.warn('Failed to log activity to database, using fallback');
        // Fallback to localStorage
        this.logToLocalStorage(data, user.id);
      }
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Fallback to localStorage
      const { data: { user } } = await this.supabase.auth.getUser();
      if (user) {
        this.logToLocalStorage(data, user.id);
      }
    }
  }

  // Fallback method for localStorage
  private logToLocalStorage(data: CreateActivityLogData, userId: string): void {
    try {
      const existingLogs = this.getStoredLogs();
      const newLog: ActivityLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_name: 'Unknown User', // Will be updated when fetched from database
        action: data.action,
        table_name: data.table_name,
        record_name: data.record_name,
        description: data.description,
        created_at: new Date().toISOString()
      };

      const updatedLogs = [newLog, ...existingLogs].slice(0, 100);
      localStorage.setItem('activity_logs', JSON.stringify(updatedLogs));
    } catch (error) {
      console.error('Failed to log to localStorage:', error);
    }
  }  // Get recent activity logs
  async getRecentActivities(limit: number = 10): Promise<ActivityLog[]> {
    try {
      // Try to fetch from database first
      const response = await fetch(`/api/admin/activity-logs?limit=${limit}`);
      if (response.ok) {
        const data = await response.json();
        return data.logs || [];
      }
      
      // Fallback to localStorage
      const logs = this.getStoredLogs();
      return logs.slice(0, limit);
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
      // Fallback to localStorage
      try {
        const logs = this.getStoredLogs();
        return logs.slice(0, limit);
      } catch {
        return [];
      }
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
      table_name: 'courses',
      record_id: courseId,
      record_name: courseTitle,
      description: `Created new course: "${courseTitle}"`
    });
  }

  async logCourseUpdated(courseId: string, courseTitle: string, oldTitle?: string): Promise<void> {
    const description = oldTitle 
      ? `Updated course title from "${oldTitle}" to "${courseTitle}"`
      : `Updated course: "${courseTitle}"`;
    
    await this.logActivity({
      action: 'UPDATE',
      table_name: 'courses',
      record_id: courseId,
      record_name: courseTitle,
      description,
      old_values: oldTitle,
      new_values: courseTitle
    });
  }

  async logCourseDeleted(courseId: string, courseTitle: string): Promise<void> {
    await this.logActivity({
      action: 'DELETE',
      table_name: 'courses',
      record_id: courseId,
      record_name: courseTitle,
      description: `Deleted course: "${courseTitle}"`
    });
  }

  async logCoursePublished(courseId: string, courseTitle: string): Promise<void> {
    await this.logActivity({
      action: 'PUBLISH',
      table_name: 'courses',
      record_id: courseId,
      record_name: courseTitle,
      description: `Published course: "${courseTitle}"`
    });
  }

  async logModuleUpdated(moduleId: string, moduleTitle: string, oldTitle?: string): Promise<void> {
    const description = oldTitle 
      ? `Updated module title from "${oldTitle}" to "${moduleTitle}"`
      : `Updated module: "${moduleTitle}"`;
    
    await this.logActivity({
      action: 'UPDATE',
      table_name: 'modules',
      record_id: moduleId,
      record_name: moduleTitle,
      description,
      old_values: oldTitle,
      new_values: moduleTitle
    });
  }

  async logUserRegistration(userId: string, userName: string): Promise<void> {
    await this.logActivity({
      action: 'REGISTER',
      table_name: 'users',
      record_id: userId,
      record_name: userName,
      description: `New user registered: ${userName}`
    });
  }

  async logProfileUpdate(userId: string, userName: string, field: string, oldValue?: string, newValue?: string): Promise<void> {
    const description = oldValue && newValue
      ? `Updated ${field} from "${oldValue}" to "${newValue}"`
      : `Updated profile information`;
    
    await this.logActivity({
      action: 'UPDATE',
      table_name: 'profiles',
      record_id: userId,
      record_name: userName,
      description,
      old_values: oldValue,
      new_values: newValue
    });
  }

  // Keep this method for compatibility but make it do nothing
  // Since you don't want "Admin dashboard accessed" logs
  async logSystemAction(action: string, details: string): Promise<void> {
    // Do nothing - you said you don't want these generic system logs
    console.log(`Ignoring system log: ${action} - ${details}`);
  }

  // Keep this method for compatibility but make it do nothing
  async logTableAccess(tableName: string): Promise<void> {
    // Do nothing - you said you don't want generic table access logs
    console.log(`Ignoring table access log: ${tableName}`);
  }


}

export const activityLogService = new ActivityLogService();
