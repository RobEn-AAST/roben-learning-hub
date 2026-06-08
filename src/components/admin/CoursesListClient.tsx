'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  BookOpen,
  Layers,
  Clock,
  FileText,
  Video,
  HelpCircle,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { coursesService } from '@/services/coursesService';
import { useCreateCourse } from '@/hooks/useQueryCache';
import type { Course } from '@/services/coursesService';

type CourseWithCounts = Course & {
  module_count: number;
  lesson_count: number;
};

type StatusFilter = 'all' | 'draft' | 'published' | 'archived';

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  published: 'bg-green-100 text-green-800 border-green-200',
  archived: 'bg-gray-100 text-gray-600 border-gray-200',
};

const statusDotColors: Record<string, string> = {
  draft: 'bg-yellow-400',
  published: 'bg-green-500',
  archived: 'bg-gray-400',
};

const gradients = [
  'from-blue-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-red-600',
  'from-pink-500 to-rose-600',
  'from-indigo-500 to-blue-600',
  'from-cyan-500 to-blue-600',
];

function getGradient(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface CoursesListClientProps {
  courses: CourseWithCounts[];
  mode?: 'admin' | 'instructor';
}

export function CoursesListClient({ courses, mode = 'admin' }: CoursesListClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const createCourseMutation = useCreateCourse();

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      search === '' || course.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || course.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const tabs: { label: string; value: StatusFilter; count: number }[] = [
    { label: 'All', value: 'all', count: courses.length },
    {
      label: 'Draft',
      value: 'draft',
      count: courses.filter((c) => c.status === 'draft').length,
    },
    {
      label: 'Published',
      value: 'published',
      count: courses.filter((c) => c.status === 'published').length,
    },
    {
      label: 'Archived',
      value: 'archived',
      count: courses.filter((c) => c.status === 'archived').length,
    },
  ];

  const handleCreateCourse = async () => {
    if (!newTitle.trim()) {
      toast.error('Title is required');
      return;
    }

    setCreating(true);
    try {
      const result = await createCourseMutation.mutateAsync({
        title: newTitle.trim(),
        description: newDescription.trim(),
        status: 'draft',
        cover_image: null,
        created_by: '',
        metadata: {},
      });

      toast.success('Course created!');
      setShowCreateDialog(false);
      setNewTitle('');
      setNewDescription('');
      router.push(`/admin/courses/${result.id}/builder`);
    } catch (err) {
      toast.error(
        `Failed to create course: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage and organize your courses
          </p>
        </div>
        {mode === 'admin' && (
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Course
          </Button>
        )}
      </div>

      {/* Search and Filter Tabs */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search courses by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                statusFilter === tab.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs text-gray-400">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Course Grid */}
      {filteredCourses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-600">No courses found</h3>
          <p className="text-sm text-gray-400 mt-1">
            {search || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first course to get started'}
          </p>
          {!search && statusFilter === 'all' && mode === 'admin' && (
            <Button
              onClick={() => setShowCreateDialog(true)}
              variant="outline"
              className="mt-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Course
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredCourses.map((course) => (
              <motion.div
                key={course.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onClick={() =>
                  router.push(`/${mode === 'instructor' ? 'instructor' : 'admin'}/courses/${course.id}`)
                }
                className="group cursor-pointer bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all duration-200"
              >
                {/* Cover Image or Gradient */}
                <div className="h-36 relative overflow-hidden">
                  {course.cover_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={course.cover_image}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div
                      className={`w-full h-full bg-gradient-to-br ${getGradient(
                        course.title
                      )} flex items-center justify-center`}
                    >
                      <BookOpen className="h-10 w-10 text-white/60" />
                    </div>
                  )}
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[course.status]}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${statusDotColors[course.status]}`}
                      />
                      {course.status.charAt(0).toUpperCase() +
                        course.status.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2 min-h-[2.5rem]">
                    {course.description || 'No description'}
                  </p>

                  {/* Stats Row */}
                  <div className="flex items-center gap-4 text-xs text-gray-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5" />
                      {course.module_count} module
                      {course.module_count !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      {course.lesson_count} lesson
                      {course.lesson_count !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1 ml-auto">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDate(course.created_at)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Course Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Course</DialogTitle>
            <DialogDescription>
              Create a draft course. You can add modules and content in the
              course builder.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="course-title">Title</Label>
              <Input
                id="course-title"
                placeholder="e.g., Introduction to Robotics"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !creating) handleCreateCourse();
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-desc">Description</Label>
              <textarea
                id="course-desc"
                placeholder="A brief description of the course..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateCourse} disabled={creating}>
              {creating ? 'Creating...' : 'Create Course'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
