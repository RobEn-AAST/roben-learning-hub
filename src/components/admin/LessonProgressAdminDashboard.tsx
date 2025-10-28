'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import {
  useAdminLessonProgress,
  useAdminLessonProgressStats,
  useCreateAdminLessonProgress,
  useUpdateAdminLessonProgress,
  useDeleteAdminLessonProgress,
  type LessonProgress,
} from '@/hooks/useQueryCache';
import { useLessons } from '@/hooks/useQueryCache';

// Icons using SVG
const Icons = {
  Activity: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  CheckCircle: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Clock: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  XCircle: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  TrendingUp: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  Plus: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
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
  ChevronLeft: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Book: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
};

interface CreateFormData {
  lesson_id: string;
  user_id: string;
  status: string;
  progress: number;
}

interface UpdateFormData {
  status: string;
  progress: number;
}

export default function LessonProgressAdminDashboard() {
  // State
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProgress, setEditingProgress] = useState<string | null>(null);
  const [createFormData, setCreateFormData] = useState<CreateFormData>({
    lesson_id: '',
    user_id: '',
    status: 'not_started',
    progress: 0,
  });
  const [updateFormData, setUpdateFormData] = useState<UpdateFormData>({
    status: 'not_started',
    progress: 0,
  });

  const limit = 20; // Increased for better UX

  // Queries
  const { data: progressData, isLoading: progressLoading } = useAdminLessonProgress({
    page,
    limit,
    status: statusFilter || undefined,
    search: searchQuery || undefined,
  });

  const { data: stats, isLoading: statsLoading } = useAdminLessonProgressStats();
  const { data: lessonsData } = useLessons();

  // Mutations
  const createMutation = useCreateAdminLessonProgress();
  const updateMutation = useUpdateAdminLessonProgress();
  const deleteMutation = useDeleteAdminLessonProgress();

  // Handlers
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createFormData.lesson_id || !createFormData.user_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await createMutation.mutateAsync(createFormData);
      toast.success('Lesson progress created successfully');
      setShowCreateForm(false);
      setCreateFormData({
        lesson_id: '',
        user_id: '',
        status: 'not_started',
        progress: 0,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create lesson progress');
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await updateMutation.mutateAsync({ id, data: updateFormData });
      toast.success('Progress updated successfully');
      setEditingProgress(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update progress');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this progress record?')) return;

    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Progress deleted successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete progress');
    }
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value === 'all' ? '' : value);
    setPage(1);
  };

  const startEditing = (progress: LessonProgress) => {
    setEditingProgress(progress.id);
    setUpdateFormData({
      status: progress.status,
      progress: progress.progress,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'in_progress':
        return <Badge variant="default" className="bg-blue-500">In Progress</Badge>;
      case 'not_started':
        return <Badge variant="secondary">Not Started</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const progressRecords = progressData?.progress || [];
  const pagination = progressData?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };
  const lessons = Array.isArray(lessonsData) ? lessonsData : [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Lesson Progress</h1>
          <p className="text-muted-foreground mt-1">Track user progress through individual lessons</p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Icons.Plus />
          <span className="ml-2">Add Progress</span>
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Icons.Activity />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Icons.CheckCircle />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-green-600">{stats?.completed || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Icons.Clock />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-blue-600">{stats?.inProgress || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Not Started</CardTitle>
            <Icons.XCircle />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.notStarted || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
            <Icons.TrendingUp />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.averageProgress || 0}%</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Progress Record</CardTitle>
            <CardDescription>Track a user's progress for a lesson</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="user_id">User ID *</Label>
                  <Input
                    id="user_id"
                    placeholder="Enter user UUID"
                    value={createFormData.user_id}
                    onChange={(e) => setCreateFormData({ ...createFormData, user_id: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lesson_id">Lesson *</Label>
                  <Select
                    value={createFormData.lesson_id}
                    onValueChange={(value) => setCreateFormData({ ...createFormData, lesson_id: value })}
                  >
                    <SelectTrigger id="lesson_id">
                      <SelectValue placeholder="Select lesson" />
                    </SelectTrigger>
                    <SelectContent>
                      {lessons && lessons.length > 0 ? (
                        lessons.map((lesson: any) => (
                          <SelectItem key={lesson.id} value={lesson.id}>
                            {lesson.title}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>No lessons available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={createFormData.status}
                    onValueChange={(value) => setCreateFormData({ ...createFormData, status: value })}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="progress">Progress: {createFormData.progress}%</Label>
                  <Slider
                    id="progress"
                    min={0}
                    max={100}
                    step={1}
                    value={[createFormData.progress]}
                    onValueChange={(value: number[]) => setCreateFormData({ ...createFormData, progress: value[0] })}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Progress'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by user or lesson..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter || 'all'} onValueChange={handleStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Table */}
      <Card>
        <CardHeader>
          <CardTitle>Progress Records ({pagination.total})</CardTitle>
        </CardHeader>
        <CardContent>
          {progressLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : progressRecords.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Icons.Activity />
              <p className="mt-2">No progress records found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {progressRecords.map((progress: LessonProgress) => (
                <Card key={progress.id}>
                  <CardContent className="pt-6">
                    {editingProgress === progress.id ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Status</Label>
                            <Select
                              value={updateFormData.status}
                              onValueChange={(value) => setUpdateFormData({ ...updateFormData, status: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="not_started">Not Started</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Progress: {updateFormData.progress}%</Label>
                            <Slider
                              min={0}
                              max={100}
                              step={1}
                              value={[updateFormData.progress]}
                              onValueChange={(value: number[]) => setUpdateFormData({ ...updateFormData, progress: value[0] })}
                            />
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdate(progress.id)}
                            disabled={updateMutation.isPending}
                          >
                            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingProgress(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <Icons.Book />
                            <div>
                              <h3 className="font-semibold">{(progress.profiles.first_name || progress.profiles.last_name) ? [progress.profiles.first_name, progress.profiles.last_name].filter(Boolean).join(' ') : progress.profiles.email}</h3>
                              <p className="text-sm text-muted-foreground">{progress.profiles.email}</p>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{progress.lessons.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Type: {progress.lessons.lesson_type}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 items-center">
                            {getStatusBadge(progress.status)}
                            <Badge variant="outline">{progress.lessons.lesson_type}</Badge>
                            <div className="text-sm">
                              <span className="font-semibold">{progress.progress}%</span> complete
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Started: {progress.started_at ? new Date(progress.started_at).toLocaleDateString() : 'N/A'}
                            {progress.completed_at && (
                              <> • Completed: {new Date(progress.completed_at).toLocaleDateString()}</>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditing(progress)}
                          >
                            <Icons.Edit />
                            <span className="ml-2">Edit</span>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(progress.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Icons.Delete />
                            <span className="ml-2">Delete</span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  <Icons.ChevronLeft />
                  <span className="ml-2">Previous</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.totalPages}
                >
                  <span className="mr-2">Next</span>
                  <Icons.ChevronRight />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
