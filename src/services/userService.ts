import { createClient } from '@/lib/supabase/client';
import { activityLogService } from './activityLogService';

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: 'user' | 'admin' | null;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  updated_at: string;
  is_anonymous: boolean;
  phone: string | null;
}

export interface CombinedUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: 'user' | 'student' | 'instructor' | 'admin' | null;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  updated_at: string;
  is_anonymous: boolean;
  phone: string | null;
}

export interface CreateUserData {
  email: string;
  password: string;
  phone?: string;
  full_name: string;
  role?: 'student' | 'instructor' | 'admin';
  bio?: string;
  avatar_url?: string;
}

export interface UpdateUserData {
  email?: string;
  phone?: string;
  full_name?: string;
  role?: 'student' | 'instructor' | 'admin';
  bio?: string;
  avatar_url?: string;
}

export interface UserStats {
  totalUsers: number;
  adminUsers: number;
  regularUsers: number;
  recentlyActive: number;
  emailConfirmed: number;
  unconfirmedUsers: number;
}

class UserService {
  private supabase = createClient();

  // Get all users with their profiles
  async getAllUsers(): Promise<CombinedUser[]> {
    try {
      // Try the server action API first (more reliable with RLS)
      try {
        const response = await fetch('/api/admin/users-server', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'same-origin',
        });

        if (response.ok) {
          const data = await response.json();
          return data.users as CombinedUser[];
        }
      } catch (serverError) {
        console.warn('Server action API failed, trying regular API:', serverError);
      }

      // Fallback to regular API route
      const response = await fetch('/api/admin/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin', // Ensure cookies are included for same-origin requests
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch users');
      }

      const data = await response.json();
      
      // Convert API response to CombinedUser format
      const combinedUsers: CombinedUser[] = data.users.map((user: any) => ({
        id: user.id,
        email: user.email || '',
        full_name: user.full_name || null,
        avatar_url: user.avatar_url || null,
        bio: user.bio || null,
        role: user.role || 'user', // Use role field from API
        email_confirmed_at: user.email_confirmed_at || null,
        last_sign_in_at: user.last_sign_in_at || null,
        created_at: user.created_at,
        updated_at: user.updated_at || user.created_at,
        is_anonymous: false,
        phone: user.phone || null
      }));

      return combinedUsers;
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      throw error;
    }
  }

  // Get a single user with profile (simplified - only gets profile data)
  async getUserById(userId: string): Promise<CombinedUser | null> {
    try {
      // Only get profile data since auth data is handled by API routes
      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return null;
      }

      return {
        id: profile.id,
        email: profile.email || '',
        full_name: profile.full_name || null,
        avatar_url: profile.avatar_url || null,
        bio: profile.bio || null,
        role: profile.role || 'user',
        email_confirmed_at: null, // Not available from profile
        last_sign_in_at: null, // Not available from profile
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        is_anonymous: false,
        phone: null
      };
    } catch (error) {
      console.error('Error in getUserById:', error);
      return null;
    }
  }

  // Create a new user (both auth and profile)
  async createUser(userData: CreateUserData): Promise<CombinedUser> {
    try {
      // Call API route instead of direct admin access
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // This is crucial for including cookies
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          full_name: userData.full_name,
          is_admin: userData.role === 'admin'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      const data = await response.json();

      // Convert API response to CombinedUser format
      const createdUser: CombinedUser = {
        id: data.user.id,
        email: data.user.email || '',
        full_name: data.user.full_name || null,
        avatar_url: data.user.avatar_url || null,
        bio: null,
        role: data.user.role || 'user', // Use role from API response
        email_confirmed_at: data.user.email_confirmed_at || null,
        last_sign_in_at: data.user.last_sign_in_at || null,
        created_at: data.user.created_at,
        updated_at: data.user.updated_at || data.user.created_at,
        is_anonymous: false,
        phone: null
      };

      // Log the activity
      await activityLogService.logSystemAction(
        'USER_CREATE',
        `Created new user: ${userData.full_name} (${userData.email})`,
        { user_id: data.user.id, role: userData.role }
      );

      return createdUser;
    } catch (error) {
      console.error('Error in createUser:', error);
      throw error;
    }
  }

  // Update user (both auth and profile)
  async updateUser(userId: string, updateData: UpdateUserData): Promise<CombinedUser> {
    try {
      // Call API route instead of direct admin access
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // This is crucial for including cookies
        body: JSON.stringify({
          email: updateData.email,
          full_name: updateData.full_name,
          role: updateData.role
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user');
      }

      const data = await response.json();

      // Check if we got the expected user data structure
      if (!data.user) {
        console.error('API response missing user data:', data);
        throw new Error('Invalid response from server - missing user data');
      }

      // Convert API response to CombinedUser format
      const updatedUser: CombinedUser = {
        id: data.user.id,
        email: data.user.email || '',
        full_name: data.user.full_name || null,
        avatar_url: data.user.avatar_url || null,
        bio: data.user.bio || null,
        role: data.user.role || 'student', // Use role from API response
        email_confirmed_at: data.user.email_confirmed_at || null,
        last_sign_in_at: data.user.last_sign_in_at || null,
        created_at: data.user.created_at,
        updated_at: data.user.updated_at || data.user.created_at,
        is_anonymous: false,
        phone: data.user.phone || null
      };

      // Log the activity
      await activityLogService.logSystemAction(
        'USER_UPDATE',
        `Updated user: ${updateData.full_name || 'User'} (${userId})`,
        { user_id: userId, changes: updateData }
      );

      return updatedUser;
    } catch (error) {
      console.error('Error in updateUser:', error);
      throw error;
    }
  }

  // Delete user (both auth and profile)
  async deleteUser(userId: string): Promise<void> {
    try {
      // Call API route instead of direct admin access
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // This is crucial for including cookies
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      // Log the activity
      await activityLogService.logSystemAction(
        'USER_DELETE',
        `Deleted user: ${userId}`,
        { deleted_user_id: userId }
      );
    } catch (error) {
      console.error('Error in deleteUser:', error);
      throw error;
    }
  }

  // Make user admin
  async makeUserAdmin(userId: string): Promise<void> {
    try {
      await this.updateUser(userId, { role: 'admin' });

      await activityLogService.logSystemAction(
        'ROLE_CHANGE',
        `Granted admin role to user: ${userId}`,
        { user_id: userId, old_role: 'user', new_role: 'admin' }
      );
    } catch (error) {
      console.error('Error in makeUserAdmin:', error);
      throw error;
    }
  }

  // Remove admin role
  async removeAdminRole(userId: string): Promise<void> {
    try {
      await this.updateUser(userId, { role: 'student' });

      await activityLogService.logSystemAction(
        'ROLE_CHANGE',
        `Removed admin role from user: ${userId}`,
        { user_id: userId, old_role: 'admin', new_role: 'student' }
      );
    } catch (error) {
      console.error('Error in removeAdminRole:', error);
      throw error;
    }
  }

  // Get user statistics
  async getUserStats(): Promise<UserStats> {
    try {
      // Try the server action API first
      try {
        const response = await fetch('/api/admin/users-server?type=stats', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'same-origin',
        });

        if (response.ok) {
          const data = await response.json();
          return data.stats as UserStats;
        }
      } catch (serverError) {
        console.warn('Server action stats API failed, calculating from users:', serverError);
      }

      // Fallback to calculating from users
      const users = await this.getAllUsers();
      
      const stats: UserStats = {
        totalUsers: users.length,
        adminUsers: users.filter(u => u.role === 'admin').length,
        regularUsers: users.filter(u => u.role === 'user' || u.role === 'student').length,
        emailConfirmed: users.filter(u => u.email_confirmed_at !== null).length,
        unconfirmedUsers: users.filter(u => u.email_confirmed_at === null).length,
        recentlyActive: users.filter(u => {
          if (!u.last_sign_in_at) return false;
          const dayAgo = new Date();
          dayAgo.setDate(dayAgo.getDate() - 7);
          return new Date(u.last_sign_in_at) > dayAgo;
        }).length
      };

      return stats;
    } catch (error) {
      console.error('Error in getUserStats:', error);
      return {
        totalUsers: 0,
        adminUsers: 0,
        regularUsers: 0,
        recentlyActive: 0,
        emailConfirmed: 0,
        unconfirmedUsers: 0
      };
    }
  }

  // Reset user password
  async resetUserPassword(userId: string, newPassword: string): Promise<void> {
    try {
      // Call API route instead of direct admin access
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // This is crucial for including cookies
        body: JSON.stringify({
          password: newPassword
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset password');
      }

      await activityLogService.logSystemAction(
        'PASSWORD_RESET',
        `Reset password for user: ${userId}`,
        { user_id: userId }
      );
    } catch (error) {
      console.error('Error in resetUserPassword:', error);
      throw error;
    }
  }
}

export const userService = new UserService();
