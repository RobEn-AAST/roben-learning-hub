'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BookOpen, User, CheckCircle, Play, Loader2 } from 'lucide-react';

interface Profile {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  avatar_url?: string;
  role?: string;
  created_at?: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  cover_image?: string;
  created_at: string;
}

interface SummaryResponse {
  success: boolean;
  profile?: Profile;
  enrolledCourses?: Course[];
  counts?: { totalEnrolled: number };
  error?: string;
}

interface ProgressEntry {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  completed: boolean;
  firstIncompleteLessonId?: string | null;
}

interface ProgressResponse {
  success: boolean;
  progress: ProgressEntry[];
  error?: string;
}

interface Recommendation {
  courseId: string;
  title: string;
  type: 'finish' | 'continue' | 'start' | 'review';
  progressPercent: number;
  message: string;
}

interface RecommendationsResponse {
  success: boolean;
  recommendations: Recommendation[];
  error?: string;
}

export function DashboardClient() {
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressData, setProgressData] = useState<ProgressEntry[] | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);
  // Recommendations removed per request

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/dashboard/summary');
        const json: SummaryResponse = await res.json();
        if (!cancelled) {
          if (!json.success) {
            setError(json.error || 'Failed to load dashboard');
          } else {
            setData(json);
            // Immediately load progress for enrolled courses (show by default)
            const courses = json.enrolledCourses || [];
            if (courses.length > 0) {
              loadProgress(courses.map((c: Course) => c.id));
            }
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Unexpected error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
    );
  }

  if (error || !data?.profile) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <p className="text-red-600 font-medium mb-4">{error || 'Failed to load dashboard.'}</p>
        <Button asChild>
          <Link href="/courses">Go to Courses</Link>
        </Button>
      </div>
    );
  }

  const { profile, enrolledCourses = [] } = data;
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email;

  async function loadProgress(courseIds: string[]) {
    setProgressLoading(true); setProgressError(null);
    try {
      const param = encodeURIComponent(courseIds.join(','));
      const res = await fetch(`/api/dashboard/progress?courseIds=${param}`);
      const json: ProgressResponse = await res.json();
      if (!json.success) setProgressError(json.error || 'Failed to load progress');
      else setProgressData(json.progress);
    } catch (e: any) {
      setProgressError(e.message || 'Progress error');
    } finally { setProgressLoading(false); }
  }

  // recommendations removed

  return (
    <div className="space-y-8">
      {/* Profile & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 border border-gray-300 flex items-center justify-center">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={fullName} className="w-full h-full object-cover" />
                ) : (
                  <img src="/assets/default-pp.png" alt="Default Avatar" className="w-full h-full object-cover" />
                )}
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">{fullName}</p>
                <p className="text-sm text-gray-600">{profile.email}</p>
              </div>
            </div>
            {profile.role && (
              <p className="text-xs inline-block px-2 py-1 rounded bg-blue-50 text-blue-700 font-medium">{profile.role}</p>
            )}
            <p className="text-xs text-gray-500">Member since {new Date(profile.created_at || '').toLocaleDateString()}</p>
            <div className="pt-2 border-t text-sm text-gray-700">
              <p>Enrolled Courses: <span className="font-semibold">{enrolledCourses.length}</span></p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" /> My Learning</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Progress shows by default; no extra toggles. */}
            {enrolledCourses.length > 0 ? (
              <div className="space-y-4">
                {enrolledCourses.map(course => (
                  <div key={course.id} className="flex items-center p-4 border rounded-lg hover:shadow-sm transition-shadow">
                    <div className="w-16 h-16 rounded bg-gray-200 overflow-hidden flex-shrink-0">
                      {course.cover_image ? (
                        <img src={course.cover_image} alt={course.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="font-semibold text-gray-900 line-clamp-1">{course.title}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2">{course.description}</p>
                      <div className="mt-2">
                        {progressLoading && !progressData && (
                          <div className="w-full">
                            <div className="w-full bg-gray-200/60 rounded-full h-2 overflow-hidden animate-pulse">
                              <div className="h-2 w-1/3 bg-gray-300 rounded-full" />
                            </div>
                            <div className="mt-1 h-3 w-28 bg-gray-200/60 rounded animate-pulse" />
                          </div>
                        )}
                        {progressError && <p className="text-xs text-red-600">{progressError}</p>}
                        {progressData && (
                          (() => {
                            const p = progressData.find(p => p.courseId === course.id);
                            if (!p) return <p className="text-xs text-gray-500">No progress yet</p>;
                            return (
                              <div>
                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${p.progressPercent}%` }}
                                  ></div>
                                </div>
                                <p className="text-xs text-gray-500 mt-1 flex justify-between">
                                  <span>{p.progressPercent}% complete</span>
                                </p>
                              </div>
                            );
                          })()
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <Button asChild size="sm">
                        <Link href={`/courses/${course.id}/learn`}>Continue <Play className="h-4 w-4 ml-1" /></Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">You haven't enrolled in any courses yet.</p>
                <Button asChild>
                  <Link href="/courses">Browse Courses</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Completed Courses Section */}
      {enrolledCourses.length > 0 && progressData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5" /> Completed Courses</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const completedIds = progressData.filter(p => p.completed).map(p => p.courseId);
              const completedCourses = enrolledCourses.filter(c => completedIds.includes(c.id));
              if (completedCourses.length === 0) {
                return <p className="text-sm text-gray-600">No completed courses yet.</p>;
              }
              return (
                <ul className="space-y-2">
                  {completedCourses.map(c => (
                    <li key={c.id} className="flex items-center justify-between p-2 rounded border">
                      <span className="text-sm text-gray-800">{c.title}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">Completed</span>
                    </li>
                  ))}
                </ul>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
