'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DebugData {
  user: {
    id: string;
    email: string;
    profile: {
      id: string;
      role: string;
      full_name: string;
    };
  };
  assignments: any[];
  allCourses: any[];
  accessibleCourses: any[];
  errors: {
    profile: string | null;
    assignments: string | null;
    courses: string | null;
    accessible: string | null;
  };
}

export default function InstructorAccessDebug() {
  const [debugData, setDebugData] = useState<DebugData | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadDebugData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/instructor-access');
      const data = await response.json();
      
      if (response.ok) {
        setDebugData(data);
        setMessage('Debug data loaded successfully');
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const assignInstructorToCourse = async (courseId: string, instructorId: string) => {
    try {
      const response = await fetch('/api/debug/instructor-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ courseId, instructorId }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage(`✅ Successfully assigned instructor to course!`);
        loadDebugData(); // Reload data
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    }
  };

  useEffect(() => {
    loadDebugData();
  }, []);

  if (loading && !debugData) {
    return <div className="p-8">Loading debug data...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">🔧 Instructor Access Debug</h1>
      
      <Button onClick={loadDebugData} disabled={loading}>
        {loading ? 'Loading...' : 'Refresh Debug Data'}
      </Button>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes('Error') || message.includes('❌') 
            ? 'bg-red-100 text-red-800' 
            : 'bg-green-100 text-green-800'
        }`}>
          {message}
        </div>
      )}

      {debugData && (
        <div className="grid gap-6">
          {/* User Info */}
          <Card>
            <CardHeader>
              <CardTitle>👤 Current User</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                {JSON.stringify(debugData.user, null, 2)}
              </pre>
            </CardContent>
          </Card>

          {/* Current Assignments */}
          <Card>
            <CardHeader>
              <CardTitle>👨‍🏫 Current Course Assignments ({debugData.assignments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {debugData.assignments.length > 0 ? (
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                  {JSON.stringify(debugData.assignments, null, 2)}
                </pre>
              ) : (
                <div className="text-red-600 font-medium">
                  ❌ No course assignments found! This is why instructor can't see courses.
                </div>
              )}
            </CardContent>
          </Card>

          {/* All Courses (Admin View) */}
          <Card>
            <CardHeader>
              <CardTitle>📚 All Courses in Database ({debugData.allCourses.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {debugData.allCourses.length > 0 ? (
                <div className="space-y-2">
                  {debugData.allCourses.map((course) => (
                    <div key={course.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <strong>{course.title}</strong>
                        <span className="ml-2 text-sm text-gray-600">({course.status})</span>
                      </div>
                      {debugData.user.profile.role === 'admin' && (
                        <Button
                          size="sm"
                          onClick={() => assignInstructorToCourse(course.id, debugData.user.id)}
                          disabled={debugData.assignments.some(a => a.course_id === course.id)}
                        >
                          {debugData.assignments.some(a => a.course_id === course.id) 
                            ? '✅ Assigned' 
                            : 'Assign to Current User'
                          }
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-red-600">No courses found in database</div>
              )}
            </CardContent>
          </Card>

          {/* Accessible Courses (RLS View) */}
          <Card>
            <CardHeader>
              <CardTitle>🔐 Courses Accessible via RLS ({debugData.accessibleCourses.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {debugData.accessibleCourses.length > 0 ? (
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                  {JSON.stringify(debugData.accessibleCourses, null, 2)}
                </pre>
              ) : (
                <div className="text-red-600 font-medium">
                  ❌ No courses accessible via RLS! This confirms the problem.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Errors */}
          {Object.values(debugData.errors).some(error => error) && (
            <Card>
              <CardHeader>
                <CardTitle>❌ Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-red-50 p-4 rounded text-sm overflow-x-auto">
                  {JSON.stringify(debugData.errors, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>🛠️ How to Fix</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">If you're an Admin:</h4>
                <p className="text-blue-700">
                  Use the "Assign to Current User" buttons above to assign courses to the instructor.
                </p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <h4 className="font-semibold text-orange-800 mb-2">If you're an Instructor:</h4>
                <p className="text-orange-700">
                  Ask an admin to assign you to courses, or log in as admin to make the assignments.
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">Expected Result:</h4>
                <p className="text-green-700">
                  After assignment, the instructor should see courses in both "All Courses" and "Accessible via RLS" sections.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}