'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ProgressRecord {
  id: string;
  lesson_id: string;
  status: string;
  created_at: string;
  lessons: {
    id: string;
    title: string;
    position: number;
    modules: {
      id: string;
      title: string;
      position: number;
      course_id: string;
    };
  };
}

interface CourseProgress {
  courseId: string;
  courseTitle: string;
  totalLessons: number;
  completedCount: number;
  percentage: number;
  lessons: Array<{
    id: string;
    title: string;
    position: number;
    modulePosition: number;
    status: string;
    created_at: string;
  }>;
}

export default function UserProgressDebug() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    summary: any;
    duplicates: any[];
    courseProgress: CourseProgress[];
    allProgressRecords: ProgressRecord[];
  } | null>(null);
  const [error, setError] = useState<string>('');
  const [resetStatus, setResetStatus] = useState<string>('');

  const fetchProgressData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/debug/user-progress');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch progress data');
    } finally {
      setLoading(false);
    }
  };

  const resetProgress = async (courseId?: string) => {
    setResetStatus('Resetting progress...');
    
    try {
      const body = courseId ? 
        { action: 'reset_course', course_id: courseId } : 
        { action: 'reset_all' };
      
      const response = await fetch('/api/progress/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        throw new Error(`Reset failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      setResetStatus(`Reset successful: ${result.message}`);
      
      // Refresh data after reset
      setTimeout(() => {
        fetchProgressData();
        setResetStatus('');
      }, 1500);
    } catch (err) {
      setResetStatus(`Reset failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  useEffect(() => {
    fetchProgressData();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading progress data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Progress Data</h3>
        <p className="text-red-700">{error}</p>
        <button
          onClick={fetchProgressData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center">
        <p>No progress data found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">User Progress Debug</h2>
        <button
          onClick={fetchProgressData}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {resetStatus && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">{resetStatus}</p>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800">Total Progress Records</h3>
          <p className="text-2xl font-bold text-blue-900">{data.summary.totalProgressRecords}</p>
        </div>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800">Duplicate Records</h3>
          <p className="text-2xl font-bold text-yellow-900">{data.summary.duplicatesCount}</p>
        </div>
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-800">Courses with Progress</h3>
          <p className="text-2xl font-bold text-green-900">{data.summary.coursesWithProgress}</p>
        </div>
      </div>

      {/* Reset Actions */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="font-semibold mb-4">Reset Actions</h3>
        <div className="space-x-4">
          <button
            onClick={() => resetProgress()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reset All Progress
          </button>
        </div>
      </div>

      {/* Course Progress */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Course Progress Analysis</h3>
        {data.courseProgress.map((course) => (
          <div key={course.courseId} className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-semibold">{course.courseTitle || `Course ${course.courseId}`}</h4>
                <p className="text-gray-600">
                  {course.completedCount} of {course.totalLessons} lessons completed ({course.percentage}%)
                </p>
              </div>
              <button
                onClick={() => resetProgress(course.courseId)}
                className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
              >
                Reset Course
              </button>
            </div>
            
            <div className="space-y-2">
              <h5 className="font-medium">Lessons Status:</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {course.lessons.map((lesson, index) => (
                  <div 
                    key={lesson.id}
                    className={`p-2 rounded text-sm ${
                      lesson.status === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <div className="font-medium">
                      M{lesson.modulePosition}.L{lesson.position}: {lesson.title}
                    </div>
                    <div className="text-xs">
                      Status: {lesson.status} | {new Date(lesson.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Duplicates */}
      {data.duplicates.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-red-800">Duplicate Progress Records</h3>
          {data.duplicates.map((dup, index) => (
            <div key={index} className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-semibold">Lesson ID: {dup.lessonId}</h4>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <p className="font-medium text-green-700">Kept (Most Recent):</p>
                  <p className="text-sm">Status: {dup.existing.status}</p>
                  <p className="text-sm">Created: {new Date(dup.existing.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="font-medium text-red-700">Removed (Duplicate):</p>
                  <p className="text-sm">Status: {dup.duplicate.status}</p>
                  <p className="text-sm">Created: {new Date(dup.duplicate.created_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Raw Data */}
      <details className="border border-gray-200 rounded-lg">
        <summary className="p-4 cursor-pointer font-semibold bg-gray-50">
          Raw Progress Records ({data.allProgressRecords.length})
        </summary>
        <div className="p-4 max-h-96 overflow-y-auto">
          <pre className="text-sm bg-gray-100 p-4 rounded overflow-x-auto">
            {JSON.stringify(data.allProgressRecords, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  );
}