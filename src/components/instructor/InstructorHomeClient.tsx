'use client';

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Layers, FileText, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CourseWithCounts {
  id: string;
  title: string;
  description: string;
  status: string;
  cover_image: string | null;
  created_at: string;
  module_count: number;
  lesson_count: number;
}

interface InstructorHomeClientProps {
  courses: CourseWithCounts[];
  displayName: string;
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
  'from-emerald-500 to-teal-600',
  'from-blue-500 to-cyan-600',
  'from-purple-500 to-indigo-600',
  'from-orange-500 to-amber-600',
  'from-rose-500 to-pink-600',
];

function getGradient(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

export function InstructorHomeClient({ courses, displayName }: InstructorHomeClientProps) {
  const router = useRouter();

  const stats = {
    total: courses.length,
    published: courses.filter((c) => c.status === 'published').length,
    draft: courses.filter((c) => c.status === 'draft').length,
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {displayName}!
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your assigned courses and content
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Courses', value: stats.total, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Published', value: stats.published, color: 'bg-green-50 text-green-700' },
          { label: 'Drafts', value: stats.draft, color: 'bg-yellow-50 text-yellow-700' },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`${stat.color} rounded-xl p-4 border border-gray-200`}
          >
            <p className="text-sm font-medium opacity-80">{stat.label}</p>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Course Grid */}
      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-600">No courses assigned</h3>
          <p className="text-sm text-gray-400 mt-1">
            Contact an admin to get assigned to courses
          </p>
        </div>
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
                onClick={() => router.push(`/instructor/courses/${course.id}/builder`)}
                className="group cursor-pointer bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all duration-200"
              >
                {/* Cover */}
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
                  <div className="absolute top-3 right-3">
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
                <div className="p-4 space-y-3">
                  <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2 min-h-[2.5rem]">
                    {course.description || 'No description'}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5" />
                      {course.module_count} module{course.module_count !== 1 ? 's' : ''}
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
  );
}
