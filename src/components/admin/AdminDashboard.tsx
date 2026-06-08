'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Layers,
  FileText,
  Clock,
  Plus,
  ExternalLink,
  Activity,
  Eye,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useCreateCourse } from '@/hooks/useQueryCache';

interface CourseWithCounts {
  id: string;
  title: string;
  description: string;
  status: string;
  cover_image: string | null;
  slug: string;
  created_at: string;
  module_count: number;
  lesson_count: number;
}

interface AdminDashboardProps {
  courses: CourseWithCounts[];
}

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

const supabaseStudioUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('supabase.co')
    ? `https://supabase.com/dashboard/project/${process.env.NEXT_PUBLIC_SUPABASE_URL.split('.')[0].replace('https://', '')}`
    : 'http://127.0.0.1:55423';

export function AdminDashboard({ courses }: AdminDashboardProps) {
  const router = useRouter();
  const createCourseMutation = useCreateCourse();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Compute stats from courses array (no extra API call)
  const stats = {
    total: courses.length,
    published: courses.filter((c) => c.status === 'published').length,
    draft: courses.filter((c) => c.status === 'draft').length,
    modules: courses.reduce((s, c) => s + c.module_count, 0),
    lessons: courses.reduce((s, c) => s + c.lesson_count, 0),
  };

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

  const statCards = [
    { label: 'Courses', value: stats.total, icon: BookOpen, color: 'text-blue-600 bg-blue-50' },
    { label: 'Published', value: stats.published, icon: Eye, color: 'text-green-600 bg-green-50' },
    { label: 'Modules', value: stats.modules, icon: Layers, color: 'text-purple-600 bg-purple-50' },
    { label: 'Lessons', value: stats.lessons, icon: FileText, color: 'text-orange-600 bg-orange-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your learning platform</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(supabaseStudioUrl, '_blank')}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Supabase Studio
          </Button>
          <Button
            size="sm"
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Course
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border border-gray-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          className="border border-gray-200 hover:shadow-md transition-all cursor-pointer group"
          onClick={() => router.push('/admin/analytics')}
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-2.5 rounded-xl text-emerald-600 bg-emerald-50 flex-shrink-0">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">Analytics</p>
              <p className="text-sm text-gray-500">Platform metrics and engagement</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className="border border-gray-200 hover:shadow-md transition-all cursor-pointer group"
          onClick={() => router.push('/admin/logs')}
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-2.5 rounded-xl text-indigo-600 bg-indigo-50 flex-shrink-0">
              <Activity className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">System Logs</p>
              <p className="text-sm text-gray-500">View activity and error reports</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Courses */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Courses</h2>
        {courses.length === 0 ? (
          <Card className="border border-dashed border-gray-300">
            <CardContent className="py-12 flex flex-col items-center justify-center text-center">
              <BookOpen className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-gray-600 font-medium">No courses yet</p>
              <p className="text-sm text-gray-400 mt-1">Create your first course to get started</p>
              <Button
                onClick={() => setShowCreateDialog(true)}
                variant="outline"
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Course
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {courses.map((course) => (
                <motion.div
                  key={course.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => router.push(`/admin/courses/${course.id}`)}
                  className="group cursor-pointer bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all duration-200"
                >
                  {/* Cover */}
                  <div className="h-32 relative overflow-hidden">
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
                        <BookOpen className="h-8 w-8 text-white/60" />
                      </div>
                    )}
                    <div className="absolute top-2.5 right-2.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[course.status] || statusColors.draft}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${statusDotColors[course.status] || statusDotColors.draft}`}
                        />
                        {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-2.5">
                    <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2 min-h-[2.5rem]">
                      {course.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5" />
                        {course.module_count} mod
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        {course.lesson_count} lesson{course.lesson_count !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1 ml-auto">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(course.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create Course Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Course</DialogTitle>
            <DialogDescription>
              Create a new course. You&apos;ll be taken to the builder to add content.
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
                placeholder="A brief description..."
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
              {creating ? 'Creating...' : 'Create & Build'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
