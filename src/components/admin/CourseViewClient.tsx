'use client';

import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  Layers,
  FileText,
  Video,
  HelpCircle,
  Package,
  Edit3,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Lesson {
  id: string;
  title: string;
  lesson_type: 'video' | 'article' | 'quiz' | 'project';
  position: number;
  status: 'visible' | 'hidden';
}

interface Module {
  id: string;
  title: string;
  description: string;
  position: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  cover_image: string | null;
  created_at: string;
}

interface CourseViewClientProps {
  course: Course;
  modules: Module[];
  mode?: 'admin' | 'instructor';
}

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  published: 'bg-green-100 text-green-800 border-green-200',
  archived: 'bg-gray-100 text-gray-600 border-gray-200',
};

const lessonTypeConfig: Record<string, { icon: typeof Video; label: string; color: string }> = {
  video: { icon: Video, label: 'Video', color: 'text-blue-500' },
  article: { icon: FileText, label: 'Article', color: 'text-emerald-500' },
  quiz: { icon: HelpCircle, label: 'Quiz', color: 'text-purple-500' },
  project: { icon: Package, label: 'Project', color: 'text-orange-500' },
};

const gradients = [
  'from-blue-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-red-600',
  'from-pink-500 to-rose-600',
  'from-indigo-500 to-blue-600',
];

function getGradient(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

export function CourseViewClient({ course, modules, mode = 'admin' }: CourseViewClientProps) {
  const router = useRouter();

  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/${mode}/courses`)}
            className="mt-1 flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900 truncate">{course.title}</h1>
              <Badge className={statusColors[course.status]}>
                {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
              </Badge>
            </div>
            {course.description && (
              <p className="text-gray-500 mt-1">{course.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-2">
              Slug: {course.slug} · Created {new Date(course.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Button
          onClick={() => router.push(`/${mode}/courses/${course.id}/builder`)}
          className="flex items-center gap-2 flex-shrink-0"
        >
          <Edit3 className="h-4 w-4" />
          Edit Course
        </Button>
      </div>

      {/* Cover Image */}
      <div className="rounded-xl overflow-hidden border border-gray-200 h-48">
        {course.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.cover_image}
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${getGradient(course.title)} flex items-center justify-center`}
          >
            <BookOpen className="h-12 w-12 text-white/40" />
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <p className="text-sm text-blue-600 font-medium">Modules</p>
          <p className="text-2xl font-bold text-blue-900">{modules.length}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <p className="text-sm text-emerald-600 font-medium">Lessons</p>
          <p className="text-2xl font-bold text-emerald-900">{totalLessons}</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
          <p className="text-sm text-purple-600 font-medium">Content Types</p>
          <p className="text-2xl font-bold text-purple-900">
            {new Set(modules.flatMap((m) => m.lessons.map((l) => l.lesson_type))).size}
          </p>
        </div>
      </div>

      {/* Curriculum */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Curriculum</h2>
        {modules.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <Layers className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No modules yet</p>
            <p className="text-sm text-gray-400">Click Edit Course to add content</p>
          </div>
        ) : (
          <div className="space-y-3">
            {modules.map((mod) => (
              <div
                key={mod.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                {/* Module header */}
                <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-7 h-7 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                        {mod.position}
                      </span>
                      <div>
                        <h3 className="font-semibold text-gray-900">{mod.title}</h3>
                        {mod.description && (
                          <p className="text-sm text-gray-500 mt-0.5">{mod.description}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-gray-500">
                      {mod.lessons.length} lesson{mod.lessons.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>

                {/* Lessons */}
                {mod.lessons.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {mod.lessons.map((lesson) => {
                      const typeConf = lessonTypeConfig[lesson.lesson_type] || lessonTypeConfig.article;
                      const TypeIcon = typeConf.icon;
                      return (
                        <div
                          key={lesson.id}
                          className="px-5 py-3 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <TypeIcon className={`h-4 w-4 ${typeConf.color}`} />
                            <span className="text-sm text-gray-700">{lesson.title}</span>
                            <span className="text-xs text-gray-400">{typeConf.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {lesson.status === 'hidden' ? (
                              <EyeOff className="h-3.5 w-3.5 text-gray-300" />
                            ) : (
                              <Eye className="h-3.5 w-3.5 text-green-400" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-5 py-4 text-sm text-gray-400 text-center">
                    No lessons in this module
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
