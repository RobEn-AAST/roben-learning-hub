'use client';

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useParams, useRouter } from "next/navigation";

interface Lesson {
  id: string;
  title: string;
  description: string;
  content_type: string;
  duration: number;
  order_index: number;
  is_preview: boolean;
}

interface Module {
  id: string;
  title: string;
  description: string;
  order_index: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description: string;
  cover_image: string | null;
  status: string;
  created_at: string;
}

interface Instructor {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
}

interface CourseData {
  course: Course;
  modules: Module[];
  isEnrolled: boolean;
  instructor: Instructor | null;
  stats: {
    enrollmentCount: number;
    moduleCount: number;
    lessonCount: number;
  };
  progress: {
    completedLessons: number;
    totalLessons: number;
    percentage: number;
  } | null;
}

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.courseId as string;
  
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (courseId) {
      fetchCourseData();
    }
  }, [courseId]);

  const fetchCourseData = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`);
      if (response.status === 401) {
        router.push('/auth/login?redirect=/courses/' + courseId);
        return;
      }
      const data = await response.json();
      setCourseData(data);
      // Expand first module by default
      if (data.modules.length > 0) {
        setExpandedModules(new Set([data.modules[0].id]));
      }
    } catch (error) {
      console.error('Error fetching course:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const response = await fetch(`/api/courses/${courseId}/enroll`, {
        method: 'POST',
      });
      const data = await response.json();
      
      if (response.ok) {
        // Refresh course data to show enrolled state
        await fetchCourseData();
        // Redirect to learning page
        router.push(`/courses/${courseId}/learn`);
      } else {
        alert(data.error || 'Failed to enroll');
      }
    } catch (error) {
      console.error('Error enrolling:', error);
      alert('Failed to enroll in course');
    } finally {
      setEnrolling(false);
    }
  };

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <div className="w-full max-w-7xl mx-auto px-6 py-12">
          <div className="animate-pulse">
            <div className="h-64 bg-gray-200 rounded-xl mb-8" />
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4" />
            <div className="h-4 bg-gray-200 rounded w-full mb-2" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
          </div>
        </div>
      </main>
    );
  }

  if (!courseData) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Course not found</h1>
          <Button asChild>
            <Link href="/courses">Back to Courses</Link>
          </Button>
        </div>
      </main>
    );
  }

  const { course, modules, isEnrolled, instructor, stats, progress } = courseData;
  const totalDuration = modules.reduce((acc, module) => 
    acc + module.lessons.reduce((sum, lesson) => sum + lesson.duration, 0), 0
  );

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-700 text-white">
        <div className="w-full max-w-7xl mx-auto px-6 py-12">
          <Link href="/courses" className="inline-flex items-center text-white hover:text-blue-100 mb-6 transition-colors">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Courses
          </Link>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-5xl font-bold mb-4"
              >
                {course.title}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xl text-blue-100 mb-6"
              >
                {course.description}
              </motion.p>

              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  {stats.enrollmentCount} students
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatDuration(totalDuration)}
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  {stats.lessonCount} lessons
                </div>
              </div>

              {instructor && (
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center overflow-hidden">
                    {instructor.avatar_url ? (
                      <Image src={instructor.avatar_url} alt={instructor.full_name} width={48} height={48} className="object-cover" />
                    ) : (
                      <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-blue-100">Instructor</p>
                    <p className="font-semibold">{instructor.full_name}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-1">
              <div className="bg-white rounded-xl shadow-xl p-6 text-gray-900">
                {course.cover_image && (
                  <div className="relative h-40 mb-4 rounded-lg overflow-hidden">
                    <Image src={course.cover_image} alt={course.title} fill className="object-cover" />
                  </div>
                )}
                
                {isEnrolled ? (
                  <>
                    {progress && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span>Your Progress</span>
                          <span className="font-semibold">{progress.percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress.percentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {progress.completedLessons} of {progress.totalLessons} lessons completed
                        </p>
                      </div>
                    )}
                    <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                      <Link href={`/courses/${courseId}/learn`}>
                        {progress && progress.completedLessons > 0 ? 'Continue Learning' : 'Start Course'}
                      </Link>
                    </Button>
                  </>
                ) : (
                  <Button 
                    onClick={handleEnroll} 
                    disabled={enrolling}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {enrolling ? 'Enrolling...' : 'Enroll Now'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Content */}
      <div className="w-full max-w-7xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Course Content</h2>
        
        <div className="space-y-4">
          {modules.map((module, index) => (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              <button
                onClick={() => toggleModule(module.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="font-bold text-blue-600">{index + 1}</span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-lg text-gray-900">{module.title}</h3>
                    {module.description && (
                      <p className="text-sm text-gray-600">{module.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {module.lessons.length} lessons • {formatDuration(module.lessons.reduce((sum, l) => sum + l.duration, 0))}
                    </p>
                  </div>
                </div>
                <svg
                  className={`w-6 h-6 text-gray-400 transition-transform ${expandedModules.has(module.id) ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expandedModules.has(module.id) && (
                <div className="border-t border-gray-200">
                  {module.lessons.map((lesson, lessonIndex) => (
                    <div
                      key={lesson.id}
                      className="px-6 py-3 hover:bg-gray-50 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="font-medium text-gray-900">{lesson.title}</p>
                          {lesson.description && (
                            <p className="text-sm text-gray-600">{lesson.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {lesson.is_preview && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Preview</span>
                        )}
                        <span className="text-sm text-gray-500">{formatDuration(lesson.duration)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
}
