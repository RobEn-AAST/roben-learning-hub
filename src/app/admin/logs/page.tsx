'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// Using simple HTML selects instead of custom Select component

interface ActivityLog {
  id: string;
  user_name: string;
  action: string;
  table_name: string;
  record_name?: string;
  description: string;
  created_at: string;
}

interface LogsResponse {
  logs: ActivityLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    totalLogs: number;
  };
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    table_name: '',
    user_name: '',
    page: 1,
    limit: 50
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });
  const [stats, setStats] = useState({ totalLogs: 0 });

  useEffect(() => {
    loadLogs();
  }, [filters]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (filters.action) params.set('action', filters.action);
      if (filters.table_name) params.set('resource_type', filters.table_name);
      if (filters.user_name) params.set('user_name', filters.user_name);
      params.set('page', filters.page.toString());
      params.set('limit', filters.limit.toString());

      const response = await fetch(`/api/admin/activity-logs?${params}`);
      
      if (response.ok) {
        const data: LogsResponse = await response.json();
        setLogs(data.logs);
        setPagination(data.pagination);
        setStats(data.stats);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch logs:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        setLogs([]);
      }
    } catch (error) {
      console.error('Error loading logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : (value as number) // Reset page when other filters change
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      CREATE: 'default',
      UPDATE: 'secondary', 
      DELETE: 'destructive',
      LOGIN: 'outline',
      REGISTER: 'default',
      VIEW: 'outline'
    };
    return <Badge variant={variants[action] || 'outline'}>{action}</Badge>;
  };

  const getResourceBadge = (tableName: string) => {
    const colors: Record<string, string> = {
      users: 'bg-blue-100 text-blue-800',
      profiles: 'bg-pink-100 text-pink-800',
      courses: 'bg-green-100 text-green-800',
      modules: 'bg-purple-100 text-purple-800',
      lessons: 'bg-indigo-100 text-indigo-800',
      quizzes: 'bg-yellow-100 text-yellow-800',
      projects: 'bg-red-100 text-red-800',
      videos: 'bg-cyan-100 text-cyan-800',
      articles: 'bg-teal-100 text-teal-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[tableName] || 'bg-gray-100 text-gray-800'}`}>
        {tableName}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">System Activity Logs</h1>
          <p className="text-gray-600 mt-2">
            Monitor all user activities and system events. Logs are automatically cleaned up after 14 days.
          </p>
        </div>
        <Button onClick={loadLogs} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                📊
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Logs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalLogs}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                📄
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Current Page</p>
                <p className="text-2xl font-bold text-gray-900">{pagination.page}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                🗂️
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Pages</p>
                <p className="text-2xl font-bold text-gray-900">{pagination.totalPages}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                🔄
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Auto-Cleanup</p>
                <p className="text-lg font-bold text-gray-900">14 Days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter logs by action, resource type, or user</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium">Action</label>
              <select 
                value={filters.action} 
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="LOGIN">Login</option>
                <option value="REGISTER">Register</option>
                <option value="VIEW">View</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Table</label>
              <select 
                value={filters.table_name} 
                onChange={(e) => handleFilterChange('table_name', e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All tables</option>
                <option value="users">Users</option>
                <option value="profiles">Profiles</option>
                <option value="courses">Courses</option>
                <option value="modules">Modules</option>
                <option value="lessons">Lessons</option>
                <option value="quizzes">Quizzes</option>
                <option value="projects">Projects</option>
                <option value="videos">Videos</option>
                <option value="articles">Articles</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Per Page</label>
              <select 
                value={filters.limit.toString()} 
                onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="25">25 logs</option>
                <option value="50">50 logs</option>
                <option value="100">100 logs</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={() => {
                  setFilters({ action: '', table_name: '', user_name: '', page: 1, limit: 50 });
                }}
                variant="outline"
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
          <CardDescription>Recent system and user activities</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No logs found matching your criteria.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        {getActionBadge(log.action)}
                        {getResourceBadge(log.table_name)}
                      </div>
                      
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        {log.description}
                      </p>
                      
                      {log.record_name && (
                        <p className="text-xs text-gray-600 mb-1">
                          Record: {log.record_name}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>User: {log.user_name}</span>
                        <span>{formatDate(log.created_at)}</span>
                        <span>Table: {log.table_name}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-600">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => handleFilterChange('page', Math.max(1, pagination.page - 1))}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                
                <span className="flex items-center px-4 py-2 text-sm">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                
                <Button
                  variant="outline"
                  onClick={() => handleFilterChange('page', Math.min(pagination.totalPages, pagination.page + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
