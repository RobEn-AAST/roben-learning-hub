'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { userService, CreateUserData, UpdateUserData, UserStats } from '@/services/userService';
import { activityLogService } from '@/services/activityLogService';

// Define CombinedUser interface for this component
interface CombinedUser {
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
  Users: () => (
    <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
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
  ),
  Shield: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Key: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  )
};

interface UserFormData {
  email: string;
  password: string;
  phone: string;
  full_name: string;
    role: 'user' | 'student' | 'instructor' | 'admin' | null;
  bio: string;
  avatar_url: string;
}

type ViewMode = 'list' | 'create' | 'edit' | 'view';

interface UserFormProps {
  user?: CombinedUser;
  onSave: (userData: CreateUserData | UpdateUserData) => Promise<void>;
  onCancel: () => void;
  mode: 'create' | 'edit';
  loading: boolean;
}

function UserForm({ user, onSave, onCancel, mode, loading }: UserFormProps) {
  const [formData, setFormData] = useState<UserFormData>({
    email: user?.email || '',
    password: '',
    phone: user?.phone || '',
    full_name: user?.full_name || '',
    role: (user?.role as 'student' | 'instructor' | 'admin') || 'student',
    bio: user?.bio || '',
    avatar_url: user?.avatar_url || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'create') {
      await onSave({
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        full_name: formData.full_name,
        role: formData.role === 'user' ? 'student' : (formData.role || 'student'),
        bio: formData.bio,
        avatar_url: formData.avatar_url
      });
    } else {
      const updateData: UpdateUserData = {};
      if (formData.email !== user?.email) updateData.email = formData.email;
      if (formData.phone !== user?.phone) updateData.phone = formData.phone;
      if (formData.full_name !== user?.full_name) updateData.full_name = formData.full_name;
      if (formData.role !== user?.role) {
        updateData.role = formData.role === 'user' ? 'student' : (formData.role || 'student');
      }
      if (formData.bio !== user?.bio) updateData.bio = formData.bio;
      if (formData.avatar_url !== user?.avatar_url) updateData.avatar_url = formData.avatar_url;
      
      await onSave(updateData);
    }
  };

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-black">{mode === 'create' ? 'Create New User' : 'Edit User'}</CardTitle>
        <CardDescription>
          {mode === 'create' 
            ? 'Create a new user account with both authentication and profile data'
            : 'Update user information and profile data'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="email" className="text-black">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="user@example.com"
                className="bg-white text-black border-gray-300"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="phone" className="text-black">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1234567890"
                className="bg-white text-black border-gray-300"
              />
            </div>
            
            {mode === 'create' && (
              <div>
                <Label htmlFor="password" className="text-black">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Minimum 6 characters"
                  className="bg-white text-black border-gray-300"
                  minLength={6}
                  required
                />
              </div>
            )}
            
            <div>
              <Label htmlFor="full_name" className="text-black">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="John Doe"
                className="bg-white text-black border-gray-300"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="role" className="text-black">Role</Label>
              <select
                id="role"
                value={formData.role || 'student'}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'student' | 'instructor' | 'admin' }))}
                className="w-full p-2 border border-gray-300 rounded bg-white text-black"
              >
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="bio" className="text-black">Bio</Label>
            <textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell us about this user..."
              className="w-full p-2 border border-gray-300 rounded bg-white text-black"
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="avatar_url" className="text-black">Avatar URL</Label>
            <Input
              id="avatar_url"
              value={formData.avatar_url}
              onChange={(e) => setFormData(prev => ({ ...prev, avatar_url: e.target.value }))}
              placeholder="https://example.com/avatar.jpg"
              className="bg-white text-black border-gray-300"
            />
          </div>
          
          <div className="flex space-x-2 pt-4">
            <Button type="submit" disabled={loading} className="flex items-center space-x-2">
              <Icons.Save />
              <span>{loading ? 'Saving...' : 'Save User'}</span>
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              <Icons.Cancel />
              <span>Cancel</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

interface UserTableProps {
  users: CombinedUser[];
  onEdit: (user: CombinedUser) => void;
  onView: (user: CombinedUser) => void;
  onDelete: (userId: string) => void;
  onResetPassword: (userId: string) => void;
}

function UserTable({ users, onEdit, onView, onDelete, onResetPassword }: UserTableProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Admin</Badge>;
      case 'instructor':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300">Instructor</Badge>;
      case 'student':
      default:
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">Student</Badge>;
    }
  };

  const getStatusBadge = (emailConfirmed: string | null) => {
    if (emailConfirmed) {
      return <Badge className="bg-green-100 text-green-800 border-green-300">Verified</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Unverified</Badge>;
  };

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-black">Users Management</CardTitle>
        <CardDescription className="text-gray-600">Manage all users and their permissions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4 font-medium text-black">User</th>
                <th className="text-left p-4 font-medium text-black">Role</th>
                <th className="text-left p-4 font-medium text-black">Phone</th>
                <th className="text-left p-4 font-medium text-black">Status</th>
                <th className="text-left p-4 font-medium text-black">Created</th>
                <th className="text-left p-4 font-medium text-black">Last Sign In</th>
                <th className="text-left p-4 font-medium text-black">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.full_name || 'User avatar'}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <Icons.Users />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-black">
                          {user.full_name || 'No Name'}
                        </div>
                        <div className="text-sm text-gray-600">{user.email}</div>
                        {user.bio && (
                          <div className="text-xs text-gray-500 truncate max-w-xs mt-1">
                            {user.bio}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-black">
                      {user.phone || 'Not provided'}
                    </div>
                  </td>
                  <td className="p-4">
                    {getStatusBadge(user.email_confirmed_at)}
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-black">{formatDate(user.created_at)}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-black">
                      {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Never'}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onView(user)}
                        className="flex items-center space-x-1"
                      >
                        <Icons.View />
                        <span>View</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(user)}
                        className="flex items-center space-x-1"
                      >
                        <Icons.Edit />
                        <span>Edit</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onResetPassword(user.id)}
                        className="flex items-center space-x-1 text-blue-600 hover:bg-blue-50"
                      >
                        <Icons.Key />
                        <span>Reset Password</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete(user.id)}
                        className="flex items-center space-x-1 text-red-600 hover:bg-red-50"
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
          {users.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No users found matching your criteria.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function UserAdminDashboard() {
  const [users, setUsers] = useState<CombinedUser[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedUser, setSelectedUser] = useState<CombinedUser | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'student' | 'instructor' | 'admin'>('all');

  useEffect(() => {
    loadData();
    // Log that user management was accessed
    activityLogService.logSystemAction('USER_MANAGEMENT_VIEW', 'User management dashboard accessed');
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Use the userService which handles the API calls properly
      const [usersData, statsData] = await Promise.all([
        userService.getAllUsers(),
        userService.getUserStats()
      ]);
      setUsers(usersData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load user data:', error);
      alert('Failed to load user data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async (userData: CreateUserData | UpdateUserData) => {
    try {
      setLoading(true);
      
      if (selectedUser) {
        // Check if updateUser method exists
        if ('updateUser' in userService) {
          await userService.updateUser(selectedUser.id, userData as UpdateUserData);
          alert('User updated successfully!');
        } else {
          throw new Error('Update user functionality not available');
        }
      } else {
        // Check if createUser method exists
        if ('createUser' in userService) {
          await userService.createUser(userData as CreateUserData);
          alert('User created successfully!');
        } else {
          throw new Error('Create user functionality not available');
        }
      }
      
      await loadData();
      setViewMode('list');
      setSelectedUser(null);
    } catch (error) {
      alert('Failed to save user: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone and will remove both the authentication account and profile data.')) {
      return;
    }

    try {
      if ('deleteUser' in userService) {
        await userService.deleteUser(userId);
        await loadData();
        alert('User deleted successfully!');
      } else {
        throw new Error('Delete user functionality not available');
      }
    } catch (error) {
      alert('Failed to delete user: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleResetPassword = async (userId: string) => {
    const newPassword = prompt('Enter new password (minimum 6 characters):');
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    try {
      if ('resetUserPassword' in userService) {
        await userService.resetUserPassword(userId, newPassword);
        alert('Password has been reset successfully!');
      } else {
        throw new Error('Reset password functionality not available');
      }
    } catch (error) {
      alert('Failed to reset password: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleCreateNew = () => {
    setSelectedUser(null);
    setViewMode('create');
  };

  const handleEdit = (user: CombinedUser) => {
    setSelectedUser(user);
    setViewMode('edit');
  };

  const handleView = (user: CombinedUser) => {
    setSelectedUser(user);
    setViewMode('view');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedUser(null);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {viewMode === 'create' ? 'Create New User' : 'Edit User'}
            </h2>
            <p className="text-gray-600">
              {viewMode === 'create' 
                ? 'Create a new user with both authentication and profile data'
                : 'Update user information and settings'
              }
            </p>
          </div>
          <Button variant="outline" onClick={handleBackToList}>
            ← Back to Users
          </Button>
        </div>
        
        <UserForm
          user={selectedUser || undefined}
          onSave={handleSaveUser}
          onCancel={handleBackToList}
          mode={viewMode}
          loading={loading}
        />
      </div>
    );
  }

  if (viewMode === 'view' && selectedUser) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">User Details</h2>
            <p className="text-gray-600">View complete user information</p>
          </div>
          <Button variant="outline" onClick={handleBackToList}>
            ← Back to Users
          </Button>
        </div>
        
        <Card className="bg-white">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                {selectedUser.avatar_url ? (
                  <img
                    src={selectedUser.avatar_url}
                    alt={selectedUser.full_name || 'User avatar'}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center">
                    <Icons.Users />
                  </div>
                )}
                <div>
                  <CardTitle className="text-2xl text-black">{selectedUser.full_name || 'No Name'}</CardTitle>
                  <p className="text-gray-600">{selectedUser.email}</p>
                </div>
              </div>
              <div className="flex flex-col space-y-2">
                <Badge className={selectedUser.role === 'admin' ? 'bg-red-100 text-red-800 border-red-300' : 'bg-blue-100 text-blue-800 border-blue-300'}>
                  {selectedUser.role === 'admin' ? 'Admin' : 'User'}
                </Badge>
                <Badge className={selectedUser.email_confirmed_at ? 'bg-green-100 text-green-800 border-green-300' : 'bg-yellow-100 text-yellow-800 border-yellow-300'}>
                  {selectedUser.email_confirmed_at ? 'Verified' : 'Unverified'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-lg font-semibold text-black mb-3">Profile Information</h3>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium text-gray-700">Full Name:</span>
                    <span className="ml-2 text-gray-900">{selectedUser.full_name || 'Not set'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Email:</span>
                    <span className="ml-2 text-gray-900">{selectedUser.email}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Role:</span>
                    <span className="ml-2 text-gray-900">{selectedUser.role || 'user'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Bio:</span>
                    <p className="ml-2 text-gray-900 mt-1">{selectedUser.bio || 'No bio provided'}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-black mb-3">Account Details</h3>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium text-gray-700">Created:</span>
                    <span className="ml-2 text-gray-900">{new Date(selectedUser.created_at).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Last Updated:</span>
                    <span className="ml-2 text-gray-900">{new Date(selectedUser.updated_at).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Email Confirmed:</span>
                    <span className="ml-2 text-gray-900">
                      {selectedUser.email_confirmed_at 
                        ? new Date(selectedUser.email_confirmed_at).toLocaleString()
                        : 'Not confirmed'
                      }
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Last Sign In:</span>
                    <span className="ml-2 text-gray-900">
                      {selectedUser.last_sign_in_at 
                        ? new Date(selectedUser.last_sign_in_at).toLocaleString()
                        : 'Never'
                      }
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Phone:</span>
                    <span className="ml-2 text-gray-900">{selectedUser.phone || 'Not set'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2 pt-4 border-t">
              <Button onClick={() => handleEdit(selectedUser)} className="flex items-center space-x-2">
                <Icons.Edit />
                <span>Edit User</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleResetPassword(selectedUser.id)}
                className="flex items-center space-x-2"
              >
                <Icons.Key />
                <span>Reset Password</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleDeleteUser(selectedUser.id)}
                className="flex items-center space-x-2 text-red-600 hover:bg-red-50"
              >
                <Icons.Delete />
                <span>Delete User</span>
              </Button>
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
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">User Management</h1>
          <p className="text-gray-600">
            Manage users, their profiles, and admin privileges. Users are managed in both authentication and profile systems.
          </p>
        </div>
        <Button onClick={handleCreateNew} className="flex items-center space-x-2">
          <Icons.Plus />
          <span>Create User</span>
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Icons.Users />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Icons.Shield />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Admin Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.adminUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Icons.View />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Recently Active</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.recentlyActive}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Icons.Key />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Unverified</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.unconfirmedUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Input
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white text-black"
              />
            </div>
            <div className="flex space-x-2">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as 'all' | 'student' | 'instructor' | 'admin')}
                className="p-2 border border-gray-300 rounded bg-white text-black"
              >
                <option value="all">All Roles</option>
                <option value="student">Students Only</option>
                <option value="instructor">Instructors Only</option>
                <option value="admin">Admins Only</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      {loading ? (
        <Card className="bg-white">
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="text-lg text-gray-600">Loading users...</div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <UserTable
          users={filteredUsers}
          onEdit={handleEdit}
          onView={handleView}
          onDelete={handleDeleteUser}
          onResetPassword={handleResetPassword}
        />
      )}
    </div>
  );
}
