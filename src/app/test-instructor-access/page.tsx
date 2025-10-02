'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface TestResults {
  userInfo?: {
    id: string;
    role: string;
    full_name: string;
  };
  courses?: any[];
  modules?: any[];
  courseInstructors?: any[];
  errors?: string[];
}

export default function InstructorAccessTest() {
  const [results, setResults] = useState<TestResults>({});
  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    setLoading(true);
    const supabase = createClient();
    const testResults: TestResults = { errors: [] };

    try {
      // 1. Get current user info
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        testResults.errors?.push(`Auth error: ${userError?.message || 'No user'}`);
        setResults(testResults);
        setLoading(false);
        return;
      }

      // 2. Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, full_name')
        .eq('id', user.id)
        .single();

      if (profileError) {
        testResults.errors?.push(`Profile error: ${profileError.message}`);
      } else {
        testResults.userInfo = profile;
      }

      // 3. Test courses access
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id, title, status');

      if (coursesError) {
        testResults.errors?.push(`Courses error: ${coursesError.message}`);
      } else {
        testResults.courses = courses;
      }

      // 4. Test modules access
      const { data: modules, error: modulesError } = await supabase
        .from('modules')
        .select(`
          id,
          title,
          course_id,
          courses(title, status)
        `);

      if (modulesError) {
        testResults.errors?.push(`Modules error: ${modulesError.message}`);
      } else {
        testResults.modules = modules;
      }

      // 5. Test course instructor assignments
      const { data: courseInstructors, error: ciError } = await supabase
        .from('course_instructors')
        .select(`
          id,
          course_id,
          instructor_id,
          assigned_at,
          courses(title)
        `);

      if (ciError) {
        testResults.errors?.push(`Course Instructors error: ${ciError.message}`);
      } else {
        testResults.courseInstructors = courseInstructors;
      }

    } catch (error) {
      testResults.errors?.push(`General error: ${error}`);
    }

    setResults(testResults);
    setLoading(false);
  };

  useEffect(() => {
    runTest();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔍 Instructor Access Test</h1>
      <button 
        onClick={runTest} 
        disabled={loading}
        style={{ 
          padding: '10px 20px', 
          marginBottom: '20px',
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'default' : 'pointer'
        }}
      >
        {loading ? 'Testing...' : 'Run Test'}
      </button>

      <div style={{ display: 'grid', gap: '20px' }}>
        {/* User Info */}
        <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px' }}>
          <h3>👤 User Information</h3>
          {results.userInfo ? (
            <pre>{JSON.stringify(results.userInfo, null, 2)}</pre>
          ) : (
            <p>No user info available</p>
          )}
        </div>

        {/* Courses */}
        <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px' }}>
          <h3>📚 Accessible Courses ({results.courses?.length || 0})</h3>
          {results.courses && results.courses.length > 0 ? (
            <pre>{JSON.stringify(results.courses, null, 2)}</pre>
          ) : (
            <p style={{ color: 'red' }}>❌ No courses accessible - This is the problem!</p>
          )}
        </div>

        {/* Modules */}
        <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px' }}>
          <h3>📖 Accessible Modules ({results.modules?.length || 0})</h3>
          {results.modules && results.modules.length > 0 ? (
            <pre>{JSON.stringify(results.modules, null, 2)}</pre>
          ) : (
            <p style={{ color: 'red' }}>❌ No modules accessible</p>
          )}
        </div>

        {/* Course Instructor Assignments */}
        <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px' }}>
          <h3>👨‍🏫 Course Instructor Assignments ({results.courseInstructors?.length || 0})</h3>
          {results.courseInstructors && results.courseInstructors.length > 0 ? (
            <pre>{JSON.stringify(results.courseInstructors, null, 2)}</pre>
          ) : (
            <p style={{ color: 'red' }}>❌ No instructor assignments found - This might be the root cause!</p>
          )}
        </div>

        {/* Errors */}
        {results.errors && results.errors.length > 0 && (
          <div style={{ backgroundColor: '#f8d7da', padding: '15px', borderRadius: '5px' }}>
            <h3>❌ Errors</h3>
            {results.errors.map((error, index) => (
              <p key={index} style={{ color: 'red' }}>{error}</p>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#d1ecf1', borderRadius: '5px' }}>
        <h3>🔧 How to Fix</h3>
        <p>If no courses are showing:</p>
        <ol>
          <li><strong>Check instructor assignment:</strong> Make sure the instructor is assigned to courses in the <code>course_instructors</code> table</li>
          <li><strong>Assign instructor to courses:</strong> As admin, go to courses management and assign this instructor to courses</li>
          <li><strong>Check RLS policies:</strong> Ensure RLS policies allow instructors to see their assigned courses</li>
        </ol>
      </div>
    </div>
  );
}