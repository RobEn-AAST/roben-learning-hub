"use client";

import React, { useEffect, useState } from "react";
import { toast } from 'sonner';
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useParams, useRouter } from "next/navigation";
import { Tooltip } from "@/components/ui/tooltip";
import dynamic from 'next/dynamic';
const ArticleRenderer = dynamic(() => import('@/components/ArticleRenderer'), {
  ssr: false,
  loading: () => <div className="py-8 text-center text-gray-500">Loading article...</div>
});

import ProjectSubmissionForm from '@/components/project/ProjectSubmissionForm';
const QuizRunner = dynamic(() => import('@/components/quiz/QuizRunner'), {
  ssr: false,
  loading: () => <div className="py-6 text-center text-gray-500">Loading quiz…</div>,
});

// (reverted) Use standard iframe embed only for video lessons


interface Lesson {
  id: string;
  title: string;
  description: string;
  lesson_type: string;
  content_url: string;
  duration: number;
  order_index: number;
  is_preview: boolean;
  articleContent?: string | null;
  projectTitle?: string | null;
  projectDescription?: string | null;
  projectInstructions?: string | null;
  projectPlatform?: string | null;
  projectExternalLink?: string | null;
  quizId?: string | null;
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

// Narrowed response type from API to avoid any
interface CourseApiResponse {
  course: CourseData["course"];
  modules: Module[];
  isEnrolled: boolean;
  progress: CourseData["progress"];
  completedLessonIds?: Array<string | number> | null;
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quizActive, setQuizActive] = useState(false);
  const [highlightLessonId, setHighlightLessonId] = useState<string | null>(null);
  // Open sidebar by default on md+ screens (initial only; do not force on resize so manual close sticks)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSidebarOpen(window.innerWidth >= 768);
    }
  }, []);
  const [markingComplete, setMarkingComplete] = useState(false);
  // Close sidebar when quiz starts to prevent navigation
  useEffect(() => {
    if (quizActive) setSidebarOpen(false);
  }, [quizActive]);

  // Allow Escape key to close sidebar for accessibility/usability
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

  useEffect(() => {
    if (courseId) {
      console.log('📚 Loading course:', courseId);
      fetchCourseData();
    } else {
      console.error('❌ No course ID provided');
      toast.error('Invalid course URL');
    }
  }, [courseId]);

  // Refresh lesson completion status when tab becomes visible
  // This helps when instructor approves a submission while student has the page open
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && courseData) {
        console.log('👁️ Tab became visible - refreshing course data (single reuest)...');
        // Re-fetch the full course payload which now includes completedLessonIds
        const latestCompletedSet = await fetchCourseData();
        // If current lesson is now complete, update the state
        if (latestCompletedSet && currentLesson && latestCompletedSet.has(currentLesson.id) && !completedLessons.has(currentLesson.id)) {
          console.log('🎉 Current lesson is now complete!');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [courseData, currentLesson, completedLessons]);

  const fetchCourseData = async () => {
    try {
  // Fetch course and modules from the public course endpoint (client-side)
  const response = await fetch(`/api/courses/${courseId}`, { cache: 'no-store' });
      if (response.status === 401) {
        router.push('/auth/login?redirect=/courses/' + courseId + '/learn');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch course learn-data:', {
          status: response.status,
          courseId,
          error: errorData
        });
        toast.error(`Failed to load course: ${errorData.error || 'Course not found'}`);
        return;
      }

  const data: CourseApiResponse = await response.json();

      if (!data.isEnrolled) {
        router.push(`/courses/${courseId}`);
        return;
      }

      // Set course + modules + progress from server payload
      setCourseData({
        course: data.course,
        modules: data.modules || [],
        isEnrolled: !!data.isEnrolled,
        progress: data.progress || null,
      });

      // The public course endpoint returns course + modules and enrollment info.
      // If the server provided completed lesson ids (fast path), use them to
      // avoid per-lesson requests. Otherwise fall back to per-lesson fetch.
      const modules = data.modules || [];
      let completedSet: Set<string> = new Set();
      if (Array.isArray(data.completedLessonIds)) {
        try {
          (data.completedLessonIds || []).forEach((id) => {
            if (id != null) completedSet.add(String(id));
          });
          setCompletedLessons(completedSet);
        } catch (e) {
          console.warn('Error normalizing completedLessonIds, falling back to per-lesson fetch:', e);
          completedSet = await fetchCompletedLessons(modules);
          setCompletedLessons(completedSet);
        }
      } else {
        completedSet = await fetchCompletedLessons(modules);
        setCompletedLessons(completedSet);
      }

      // Only set the initial lesson if we don't already have one selected
      if (!currentLesson) {
        if (modules && modules.length > 0) {
          const firstIncompleteLesson = findFirstIncompleteLesson(modules, completedSet);
          if (firstIncompleteLesson) {
            console.log('🎯 Starting at lesson:', firstIncompleteLesson.lesson.title, 'in module:', firstIncompleteLesson.module.title);
            setCurrentLesson(firstIncompleteLesson.lesson);
            setCurrentModule(firstIncompleteLesson.module);
          } else {
            console.warn('⚠️ No lessons found in course modules');
            toast.error('This course has no lessons yet');
          }
        } else {
          console.warn('⚠️ Course has no modules');
          toast.error('This course has no content yet');
        }
      }
      else if (modules && modules.length > 0) {
        // Keep the current lesson if it still exists in the new payload; otherwise, pick a sensible fallback
        const stillExists = modules.some((m: Module) => (m.lessons || []).some((l: Lesson) => l.id === currentLesson.id));
        if (!stillExists) {
          const firstIncompleteLesson = findFirstIncompleteLesson(modules, completedSet) || (modules[0]?.lessons?.[0] ? { lesson: modules[0].lessons[0], module: modules[0] } : null);
          if (firstIncompleteLesson) {
            setCurrentLesson(firstIncompleteLesson.lesson);
            setCurrentModule(firstIncompleteLesson.module);
          }
        }
      }
      else {
        console.warn('⚠️ Course has no modules');
        toast.error('This course has no content yet');
      }

      // Return the computed completed set so callers (like visibility refresh)
      // can react to changes without performing additional per-lesson calls.
      return completedSet;
    } catch (error) {
      console.error('Error fetching course learn-data:', error);
      toast.error('Failed to load course data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletedLessons = async (modules: Module[]) => {
    // We removed the client-side per-lesson progress fetch fallback.
    // The server now provides `completedLessonIds` in the course payload
    // (GET /api/courses/:id). This function remains for API compatibility
    // but will not perform network requests.
    console.warn('fetchCompletedLessons called — server should provide completedLessonIds via course payload. Keeping current set.');
    return completedLessons;
  };

  const findFirstIncompleteLesson = (modules: Module[], completed: Set<string>) => {
    for (const mod of modules) {
      for (const lesson of mod.lessons) {
        if (!completed.has(lesson.id)) {
          return { lesson, module: mod };
        }
      }
    }
    // If all completed, return first lesson
    if (modules.length > 0 && modules[0].lessons.length > 0) {
      return { lesson: modules[0].lessons[0], module: modules[0] };
    }
    return null;
  };

  const handleLessonSelect = (lesson: Lesson, selectedModule: Module) => {
    setCurrentLesson(lesson);
    setCurrentModule(selectedModule);
  };

  const handleMarkComplete = async () => {
    if (!currentLesson) return;
    
    // Check if lesson is already completed to prevent duplicate API calls
    if (completedLessons.has(currentLesson.id)) {
      console.log('ℹ️ Lesson already marked complete, skipping duplicate progress record');
      return;
    }
    
    setMarkingComplete(true);
    try {
      const response = await fetch(`/api/lessons/${currentLesson.id}/progress`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to mark lesson complete:', response.status, errorText);
        alert('Failed to mark lesson as complete. Please try again.');
        return;
      }
      
      const data = await response.json();
      
      if (response.ok) {
        // Add lesson to completed set
        const newCompletedLessons = new Set([...completedLessons, currentLesson.id]);
        setCompletedLessons(newCompletedLessons);
        
        console.log('✅ Lesson marked as complete:', currentLesson.title);
        
        // Update progress percentage using the new count
        if (courseData) {
          const totalLessons = courseData.modules.reduce((acc, m) => acc + m.lessons.length, 0);
          const newCompletedCount = newCompletedLessons.size; // Use the new set size
          const newPercentage = Math.round((newCompletedCount / totalLessons) * 100);
          
          console.log('📊 Progress updated:', {
            completed: newCompletedCount,
            total: totalLessons,
            percentage: newPercentage
          });
          
          setCourseData({
            ...courseData,
            progress: {
              completedLessons: newCompletedCount,
              totalLessons: totalLessons,
              percentage: newPercentage
            }
          });
        }
        
        // After marking complete, if there's a next lesson: open the sidebar, scroll to it, and briefly highlight it
        const nxt = getNextLesson();
        if (nxt?.lesson?.id) {
          setSidebarOpen(true);
          setHighlightLessonId(nxt.lesson.id);
          // Defer until sidebar renders
          setTimeout(() => {
            const el = document.querySelector(`[data-lesson-id="${nxt.lesson.id}"]`);
            if (el && 'scrollIntoView' in el) {
              try { (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
            }
          }, 150);
          // Remove highlight after a short period
          setTimeout(() => setHighlightLessonId(prev => (prev === nxt.lesson.id ? null : prev)), 2500);
        }
      } else {
        console.error('Failed to mark lesson complete:', data.error, data.details);
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

    // Convert YouTube URLs to embed format (configurable domain)
    const convertToEmbedUrl = (url: string): string => {
      if (!url) return url;
      
      // YouTube URL patterns to convert to embed
      const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = url.match(youtubeRegex);
      
      if (match && match[1]) {
        const videoId = match[1];
        // Choose host: by default, prefer standard domain to ensure latest UI; allow override via env
        const embedHost = process.env.NEXT_PUBLIC_YT_EMBED_DOMAIN || 'www.youtube.com';
        // Supported, modern params only
        const params = new URLSearchParams();
        params.set('rel', '0');
        params.set('controls', '1');
        params.set('modestbranding', '1');
        params.set('playsinline', '1');
        // Use JS API + origin to ensure latest player behaviors and avoid legacy fallbacks
        params.set('enablejsapi', '1');
        if (typeof window !== 'undefined') {
          if (window.location?.origin) params.set('origin', window.location.origin);
          const lang = (navigator?.language || 'en').split('-')[0];
          if (lang) params.set('hl', lang);
        }
        return `https://${embedHost}/embed/${videoId}?${params.toString()}`;
      }
      
      // If it's not a YouTube URL or already an embed URL, return as is
      return url;
    };

  const renderVideoContent = () => {
      console.log('🎥 Rendering video content:', {
        lesson_type: currentLesson.lesson_type,
        content_url: currentLesson.content_url,
        hasUrl: !!currentLesson.content_url,
        urlLength: currentLesson.content_url?.length
      });

      if (currentLesson.lesson_type === 'video' && currentLesson.content_url) {
        // Use modern YouTube embed (or passthrough) with native controls
        const embedUrl = convertToEmbedUrl(currentLesson.content_url);
        return (
          <div className="w-full aspect-video bg-black rounded-lg overflow-hidden shadow-lg relative">
            <iframe
              src={embedUrl}
              title={currentLesson.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              loading="lazy"
              allowFullScreen
            />
          </div>
        );
      }
      
      // Show debug info when no video
      return (
        <div className="w-full aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">No Video Content</p>
            <p className="text-xs text-gray-500 mt-2">
              Type: {currentLesson.lesson_type} | URL: {currentLesson.content_url || 'None'}
            </p>
          </div>
        </div>
      );
    };

    // Debug logging moved to a useEffect that runs only when currentLesson changes

    return (
      <div className="p-6">
        {currentLesson.lesson_type === 'video' && renderVideoContent()}
        
        {currentLesson.lesson_type === 'article' && (
          <div className="max-w-none">
            <ArticleRenderer content={currentLesson.articleContent} />
          </div>
        )}
        
        {currentLesson.lesson_type === 'project' && (
          <div className="max-w-4xl mx-auto">
            <ProjectSubmissionForm
              lessonId={currentLesson.id}
              lessonTitle={currentLesson.title}
              projectTitle={currentLesson.projectTitle}
              projectDescription={currentLesson.projectDescription}
              projectInstructions={currentLesson.projectInstructions}
              projectPlatform={currentLesson.projectPlatform}
              onSubmitSuccess={handleMarkComplete}
            />
          </div>
        )}
        
            {currentLesson.lesson_type === 'quiz' && (
          <div className="max-w-4xl mx-auto">
            {currentLesson.quizId ? (
              <QuizRunner
                quizId={currentLesson.quizId}
                lessonId={currentLesson.id}
                onCompleted={handleMarkComplete}
                onPhaseChange={(p) => {
                  setQuizActive(p === 'active');
                      // Do not auto-open sidebar on completed; allow user to control visibility
                }}
              />
            ) : (
              <div className="p-6 text-center text-gray-500">Quiz isn’t configured for this lesson.</div>
            )}
          </div>
        )}
        
    
      </div>
    );
  };

  const nextLesson = getNextLesson();
  const prevLesson = getPreviousLesson();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-blue-600 text-xl flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600"></div>
          Loading course...
        </div>
      </div>
    );
  }

  if (!courseData || !currentLesson) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-700 text-xl mb-4">Unable to load course</p>
          <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
            <Link href="/courses">Back to Courses</Link>
          </Button>
        </div>
      </div>
    );
  }
  const progress = courseData.progress;
  const isLessonComplete = completedLessons.has(currentLesson.id);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Course Progress Bar */}
      {progress && (
        <div className="bg-blue-600 h-1">
          <div 
            className="bg-white h-1" 
            style={{width: `${progress.percentage}%`}}
          ></div>
        </div>
      )}
      
      {/* Top Navigation */}
      <div className="bg-blue-600 shadow-md px-4 md:px-6 py-2 md:py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Link href={`/courses/${courseId}`} className="text-white hover:text-blue-100 transition-colors bg-blue-700 rounded-full p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-white font-bold text-sm md:text-base line-clamp-1">{courseData.course.title}</h1>
            <div className="flex items-center gap-2 text-xs md:text-sm text-blue-100">
              {progress && (
                <span className="bg-blue-700 px-2 py-0.5 rounded-full flex items-center">
                  <div className="w-16 h-2 bg-blue-300/30 rounded-full mr-2">
                    <div className="h-2 bg-white rounded-full" style={{ width: `${progress.percentage}%` }}></div>
                  </div>
                  <span>{progress.percentage}%</span>
                </span>
              )}
              <span>
                {courseData.modules.length} {courseData.modules.length === 1 ? 'module' : 'modules'} •
                {courseData.modules.reduce((acc, m) => acc + m.lessons.length, 0)} {courseData.modules.reduce((acc, m) => acc + m.lessons.length, 0) === 1 ? 'lesson' : 'lessons'}
              </span>
            </div>
          </div>
        </div>

        <Button size="sm" variant="ghost" onClick={() => setSidebarOpen(!sidebarOpen)} disabled={quizActive} aria-disabled={quizActive} className={`text-white ${quizActive ? 'bg-blue-600/60 cursor-not-allowed' : 'bg-blue-700 hover:bg-blue-800'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Button>
      </div>

      <div className="flex flex-1">
        <div className="flex-1 bg-gray-50">
          <div className="max-w-5xl mx-auto p-4 md:p-6">
            <motion.div key={currentLesson.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="bg-white p-4 md:p-6 rounded-lg shadow-sm">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{currentModule?.title}</span>
                  {isLessonComplete && (
                    <span className="flex items-center text-green-600 text-sm bg-green-50 px-3 py-1 rounded-full">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Completed
                    </span>
                  )}
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">{currentLesson.title}</h2>
                {currentLesson.description && <p className="text-gray-600 text-sm md:text-base">{currentLesson.description}</p>}
              </div>

              <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100">{renderLessonContent()}</div>

              {!quizActive && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-6 md:mt-8">
                <Button onClick={() => { if (prevLesson) { setCurrentLesson(prevLesson.lesson); setCurrentModule(prevLesson.module); } }} disabled={!prevLesson} variant="outline" className="w-full sm:w-auto text-blue-600 border-blue-200 hover:bg-blue-50 disabled:text-gray-400 disabled:border-gray-200 rounded-md">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </Button>

                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  {!isLessonComplete && (currentLesson.lesson_type === 'video' || currentLesson.lesson_type === 'article') && (
                    <Button onClick={handleMarkComplete} disabled={markingComplete} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-md">
                      {markingComplete ? (
                        <span className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                          Marking Complete...
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Mark as Complete
                        </span>
                      )}
                    </Button>
                  )}

                  {nextLesson && (
                    <Tooltip content={!isLessonComplete ? "Complete this lesson first" : ""} side="top">
                      <Button onClick={() => { if (isLessonComplete) { setCurrentLesson(nextLesson.lesson); setCurrentModule(nextLesson.module); } }} disabled={!isLessonComplete} className={`w-full sm:w-auto ${isLessonComplete ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'} text-white rounded-md`}>
                        {!isLessonComplete && (
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        )}
                        Next Lesson
                        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Button>
                    </Tooltip>
                  )}
                </div>
              </div>
              )}
            </motion.div>
          </div>
        </div>

        <AnimatePresence>
          {sidebarOpen && (
            <>
              <div className="md:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setSidebarOpen(false)}></div>
              <motion.div initial={{ x: 300 }} animate={{ x: 0 }} exit={{ x: 300 }} transition={{ duration: 0.3 }} drag="x" dragElastic={0.1} onDragEnd={(e, info) => { if (info.offset.x > 60) setSidebarOpen(false); }} className="fixed md:static inset-y-0 right-0 z-50 md:z-auto w-72 md:w-80 bg-white border-l border-gray-200 shadow-xl md:shadow-inner">
                <div className="sticky md:top-0 h-full md:h-screen overflow-y-auto scrollbar-hide">
                  <div className="p-4">
                    <div className="border-b border-gray-200 pb-3 mb-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-gray-800 font-bold">Course Content</h3>
                        <button
                          type="button"
                          className="md:hidden text-gray-500 hover:text-gray-700 p-1 rounded"
                          aria-label="Close sidebar"
                          onClick={() => setSidebarOpen(false)}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-500 mt-1">
                        <div>
                          {courseData.modules.length} {courseData.modules.length === 1 ? 'module' : 'modules'} • {courseData.modules.reduce((acc, m) => acc + m.lessons.length, 0)} {courseData.modules.reduce((acc, m) => acc + m.lessons.length, 0) === 1 ? 'lesson' : 'lessons'}
                        </div>
                        {progress && <div>{progress.percentage}% complete</div>}
                      </div>
                    </div>

                    {courseData.modules.map((module, moduleIndex) => (
                      <div key={module.id} className="mb-6">
                        <div className="bg-blue-50 px-3 py-2 rounded-md text-sm font-semibold text-blue-800 mb-2 flex items-center justify-between">
                          <span>Module {moduleIndex + 1}: {module.title}</span>
                          <div className="text-xs text-blue-600">{module.lessons.filter(l => completedLessons.has(l.id)).length}/{module.lessons.length}</div>
                        </div>
                        <div className="space-y-1">
                          {module.lessons.map((lesson, lessonIndex) => {
                            const isComplete = completedLessons.has(lesson.id);
                            const isCurrent = currentLesson.id === lesson.id;
                            let isAccessible = lessonIndex === 0;
                            if (lessonIndex > 0) {
                              const prev = module.lessons[lessonIndex - 1];
                              isAccessible = completedLessons.has(prev.id) || isComplete;
                            }
                            const modIdx = courseData.modules.findIndex(m => m.id === module.id);
                            if (modIdx > 0 && lessonIndex === 0) {
                              const prevModule = courseData.modules[modIdx - 1];
                              if (prevModule?.lessons?.length) {
                                const lastPrev = prevModule.lessons[prevModule.lessons.length - 1];
                                if (lastPrev?.id) isAccessible = completedLessons.has(lastPrev.id) || isComplete;
                              }
                            }

                            // Lock navigation during active quiz: only current lesson is clickable
                            const canClick = quizActive ? (lesson.id === currentLesson.id) : isAccessible;
                            const isHighlighted = highlightLessonId === lesson.id;

                            return (
                              <button key={lesson.id} data-lesson-id={lesson.id} onClick={() => { if (canClick) { handleLessonSelect(lesson, module); } }} disabled={!canClick} className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${isCurrent ? 'bg-blue-100 text-blue-800 border-l-4 border-blue-600' : canClick ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-400 cursor-not-allowed'} ${isHighlighted ? 'ring-2 ring-blue-400' : ''}`}>
                                <div className="flex flex-col w-full">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      {isComplete ? (
                                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                      ) : !isAccessible ? (
                                        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                      ) : (
                                        <div className="w-4 h-4 border-2 border-gray-300 rounded-full"></div>
                                      )}
                                      <span className="flex-1">{lesson.title}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center text-xs text-gray-500 mt-1 ml-6">
                                    <span className="capitalize flex items-center">
                                      {lesson.lesson_type === 'video' && (
                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                      )}
                                      {lesson.lesson_type === 'article' && (
                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                      )}
                                      {lesson.lesson_type === 'project' && (
                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                      )}
                                      {lesson.lesson_type === 'quiz' && (
                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                        </svg>
                                      )}
                                      {lesson.lesson_type}
                                    </span>
                                    {lesson.duration > 0 && (
                                      <>
                                        <span className="mx-1">•</span>
                                        <span>{lesson.duration} min</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
