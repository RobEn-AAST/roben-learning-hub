'use client';

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useParams, useRouter } from "next/navigation";

interface Lesson {
  id: string;
  title: string;
  description: string;
  content_type: string;
  content_url: string;
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

interface CourseData {
  course: {
    id: string;
    title: string;
    description: string;
  };
  modules: Module[];
  isEnrolled: boolean;
  progress: {
    completedLessons: number;
    totalLessons: number;
    percentage: number;
  } | null;
}

export default function CourseLearnPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.courseId as string;
  
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [currentModule, setCurrentModule] = useState<Module | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [markingComplete, setMarkingComplete] = useState(false);

  useEffect(() => {
    if (courseId) {
      fetchCourseData();
    }
  }, [courseId]);

  const fetchCourseData = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`);
      if (response.status === 401) {
        router.push('/auth/login?redirect=/courses/' + courseId + '/learn');
        return;
      }
      const data = await response.json();
      
      if (!data.isEnrolled) {
        router.push(`/courses/${courseId}`);
        return;
      }

      setCourseData(data);
      
      // Load completed lessons
      if (data.modules.length > 0) {
        await fetchCompletedLessons(data.modules);
        
        // Set first incomplete lesson or first lesson
        const firstIncompleteLesson = findFirstIncompleteLesson(data.modules, new Set());
        if (firstIncompleteLesson) {
          setCurrentLesson(firstIncompleteLesson.lesson);
          setCurrentModule(firstIncompleteLesson.module);
        }
      }
    } catch (error) {
      console.error('Error fetching course:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletedLessons = async (modules: Module[]) => {
    const allLessons = modules.flatMap(m => m.lessons);
    const completed = new Set<string>();
    
    // Fetch completion status for all lessons
    for (const lesson of allLessons) {
      try {
        const response = await fetch(`/api/lessons/${lesson.id}/progress`);
        const data = await response.json();
        if (data.completed) {
          completed.add(lesson.id);
        }
      } catch (error) {
        console.error('Error fetching lesson progress:', error);
      }
    }
    
    setCompletedLessons(completed);
    return completed;
  };

  const findFirstIncompleteLesson = (modules: Module[], completed: Set<string>) => {
    for (const module of modules) {
      for (const lesson of module.lessons) {
        if (!completed.has(lesson.id)) {
          return { lesson, module };
        }
      }
    }
    // If all completed, return first lesson
    if (modules.length > 0 && modules[0].lessons.length > 0) {
      return { lesson: modules[0].lessons[0], module: modules[0] };
    }
    return null;
  };

  const handleLessonSelect = (lesson: Lesson, module: Module) => {
    setCurrentLesson(lesson);
    setCurrentModule(module);
  };

  const handleMarkComplete = async () => {
    if (!currentLesson) return;
    
    setMarkingComplete(true);
    try {
      const response = await fetch(`/api/lessons/${currentLesson.id}/progress`, {
        method: 'POST',
      });
      
      if (response.ok) {
        setCompletedLessons(prev => new Set([...prev, currentLesson.id]));
        
        // Auto-advance to next lesson
        const nextLesson = getNextLesson();
        if (nextLesson) {
          setTimeout(() => {
            setCurrentLesson(nextLesson.lesson);
            setCurrentModule(nextLesson.module);
          }, 500);
        }
      }
    } catch (error) {
      console.error('Error marking lesson complete:', error);
    } finally {
      setMarkingComplete(false);
    }
  };

  const getNextLesson = (): { lesson: Lesson; module: Module } | null => {
    if (!courseData || !currentLesson || !currentModule) return null;

    const currentModuleIndex = courseData.modules.findIndex(m => m.id === currentModule.id);
    const currentLessonIndex = currentModule.lessons.findIndex(l => l.id === currentLesson.id);

    // Try next lesson in current module
    if (currentLessonIndex < currentModule.lessons.length - 1) {
      return {
        lesson: currentModule.lessons[currentLessonIndex + 1],
        module: currentModule
      };
    }

    // Try first lesson in next module
    if (currentModuleIndex < courseData.modules.length - 1) {
      const nextModule = courseData.modules[currentModuleIndex + 1];
      if (nextModule.lessons.length > 0) {
        return {
          lesson: nextModule.lessons[0],
          module: nextModule
        };
      }
    }

    return null;
  };

  const getPreviousLesson = (): { lesson: Lesson; module: Module } | null => {
    if (!courseData || !currentLesson || !currentModule) return null;

    const currentModuleIndex = courseData.modules.findIndex(m => m.id === currentModule.id);
    const currentLessonIndex = currentModule.lessons.findIndex(l => l.id === currentLesson.id);

    // Try previous lesson in current module
    if (currentLessonIndex > 0) {
      return {
        lesson: currentModule.lessons[currentLessonIndex - 1],
        module: currentModule
      };
    }

    // Try last lesson in previous module
    if (currentModuleIndex > 0) {
      const prevModule = courseData.modules[currentModuleIndex - 1];
      if (prevModule.lessons.length > 0) {
        return {
          lesson: prevModule.lessons[prevModule.lessons.length - 1],
          module: prevModule
        };
      }
    }

    return null;
  };

  const renderLessonContent = () => {
    if (!currentLesson) return null;

    if (currentLesson.content_type === 'video') {
      // Check if it's a YouTube video
      if (currentLesson.content_url?.includes('youtube.com') || currentLesson.content_url?.includes('youtu.be')) {
        let videoId = '';
        if (currentLesson.content_url.includes('youtube.com')) {
          const url = new URL(currentLesson.content_url);
          videoId = url.searchParams.get('v') || '';
        } else if (currentLesson.content_url.includes('youtu.be')) {
          videoId = currentLesson.content_url.split('/').pop() || '';
        }

        return (
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              className="absolute top-0 left-0 w-full h-full rounded-lg"
              src={`https://www.youtube.com/embed/${videoId}`}
              title={currentLesson.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        );
      }

      // Regular video
      return (
        <video
          className="w-full rounded-lg"
          controls
          src={currentLesson.content_url}
        >
          Your browser does not support the video tag.
        </video>
      );
    }

    if (currentLesson.content_type === 'article') {
      return (
        <div className="prose max-w-none">
          <iframe
            className="w-full h-[600px] rounded-lg border"
            src={currentLesson.content_url}
            title={currentLesson.title}
          />
        </div>
      );
    }

    return (
      <div className="text-center py-12 text-gray-500">
        <p>Content type not supported: {currentLesson.content_type}</p>
      </div>
    );
  };

  const nextLesson = getNextLesson();
  const prevLesson = getPreviousLesson();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading course...</div>
      </div>
    );
  }

  if (!courseData || !currentLesson) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Unable to load course</p>
          <Button asChild>
            <Link href="/courses">Back to Courses</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isLessonComplete = completedLessons.has(currentLesson.id);
  const progress = courseData.progress;

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Top Navigation */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/courses/${courseId}`} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Link>
          <div>
            <h1 className="text-white font-semibold">{courseData.course.title}</h1>
            {progress && (
              <p className="text-sm text-gray-400">
                {progress.completedLessons} of {progress.totalLessons} lessons • {progress.percentage}% complete
              </p>
            )}
          </div>
        </div>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-white hover:bg-gray-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-6">
            <motion.div
              key={currentLesson.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-blue-400">{currentModule?.title}</span>
                  {isLessonComplete && (
                    <span className="flex items-center text-green-400 text-sm">
                      <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Completed
                    </span>
                  )}
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">{currentLesson.title}</h2>
                {currentLesson.description && (
                  <p className="text-gray-400">{currentLesson.description}</p>
                )}
              </div>

              {renderLessonContent()}

              <div className="flex items-center justify-between mt-6">
                <Button
                  onClick={() => {
                    if (prevLesson) {
                      setCurrentLesson(prevLesson.lesson);
                      setCurrentModule(prevLesson.module);
                    }
                  }}
                  disabled={!prevLesson}
                  variant="outline"
                  className="text-white border-gray-600 hover:bg-gray-800"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </Button>

                <div className="flex gap-2">
                  {!isLessonComplete && (
                    <Button
                      onClick={handleMarkComplete}
                      disabled={markingComplete}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {markingComplete ? 'Marking...' : 'Mark as Complete'}
                    </Button>
                  )}
                  
                  {nextLesson && (
                    <Button
                      onClick={() => {
                        setCurrentLesson(nextLesson.lesson);
                        setCurrentModule(nextLesson.module);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Next Lesson
                      <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ x: 300 }}
              animate={{ x: 0 }}
              exit={{ x: 300 }}
              transition={{ duration: 0.3 }}
              className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto"
            >
              <div className="p-4">
                <h3 className="text-white font-bold mb-4">Course Content</h3>
                
                {courseData.modules.map((module, moduleIndex) => (
                  <div key={module.id} className="mb-4">
                    <div className="text-sm font-semibold text-gray-400 mb-2">
                      {moduleIndex + 1}. {module.title}
                    </div>
                    <div className="space-y-1">
                      {module.lessons.map((lesson) => {
                        const isComplete = completedLessons.has(lesson.id);
                        const isCurrent = currentLesson.id === lesson.id;
                        
                        return (
                          <button
                            key={lesson.id}
                            onClick={() => handleLessonSelect(lesson, module)}
                            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                              isCurrent
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-300 hover:bg-gray-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="flex-1">{lesson.title}</span>
                              {isComplete && (
                                <svg className="w-4 h-4 text-green-400 flex-shrink-0 ml-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
