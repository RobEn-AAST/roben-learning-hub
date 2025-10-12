'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface DebugEnrollmentProps {
  courseId: string;
}

export function DebugEnrollment({ courseId }: DebugEnrollmentProps) {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const testEnrollment = async () => {
    setTesting(true);
    setResults(null);

    try {
      // Test 1: Check if we can see the course
      console.log('Testing course visibility for courseId:', courseId);
      
      const courseResponse = await fetch(`/api/courses/${courseId}`);
      const courseData = await courseResponse.json();
      
      console.log('Course API response:', courseData);

      // Test 2: Try enrollment
      const enrollResponse = await fetch(`/api/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const enrollData = await enrollResponse.json();
      console.log('Enrollment API response:', enrollData);

      setResults({
        courseCheck: {
          success: courseResponse.ok,
          status: courseResponse.status,
          data: courseData
        },
        enrollment: {
          success: enrollResponse.ok,
          status: enrollResponse.status,
          data: enrollData
        }
      });

    } catch (error) {
      console.error('Test enrollment error:', error);
      setResults({
        error: (error as Error).message
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="mt-4 p-4 border rounded-lg bg-blue-50">
      <h3 className="font-bold text-blue-800 mb-2">🐛 Debug Enrollment Process</h3>
      <Button 
        onClick={testEnrollment} 
        disabled={testing}
        className="mb-4"
      >
        {testing ? 'Testing...' : 'Test Enrollment API'}
      </Button>
      
      {results && (
        <div className="space-y-4">
          {results.error ? (
            <div className="p-2 bg-red-100 text-red-700 rounded">
              Error: {results.error}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <h4 className="font-semibold">Course Visibility Check:</h4>
                <div className={`p-2 rounded ${results.courseCheck.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  Status: {results.courseCheck.status} {results.courseCheck.success ? '✅' : '❌'}
                </div>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                  {JSON.stringify(results.courseCheck.data, null, 2)}
                </pre>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Enrollment Attempt:</h4>
                <div className={`p-2 rounded ${results.enrollment.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  Status: {results.enrollment.status} {results.enrollment.success ? '✅' : '❌'}
                </div>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                  {JSON.stringify(results.enrollment.data, null, 2)}
                </pre>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}