'use client';

import { useState, useEffect } from 'react';
import { moduleService } from '@/services/moduleService';
import { coursesService } from '@/services/coursesService';

export default function ModulesDebugTest() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const testResults: any = {};

    try {
      // Test 1: Direct courses service call
      console.log('🧪 Testing direct courses service...');
      try {
        const coursesResult = await coursesService.getCourses(1, 5);
        testResults.courses = {
          success: true,
          count: coursesResult.courses.length,
          total: coursesResult.total,
          data: coursesResult.courses.slice(0, 2) // Just first 2 for display
        };
        console.log('✅ Courses service success:', coursesResult);
      } catch (error) {
        testResults.courses = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        console.error('❌ Courses service failed:', error);
      }

      // Test 2: Direct module service - get courses for select
      console.log('🧪 Testing module service getCoursesForSelect...');
      try {
        const coursesForSelect = await moduleService.getCoursesForSelect();
        testResults.coursesForSelect = {
          success: true,
          count: coursesForSelect.length,
          data: coursesForSelect.slice(0, 2)
        };
        console.log('✅ Courses for select success:', coursesForSelect);
      } catch (error) {
        testResults.coursesForSelect = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        console.error('❌ Courses for select failed:', error);
      }

      // Test 3: Direct module service - get modules
      console.log('🧪 Testing module service getModules...');
      try {
        const modulesResult = await moduleService.getModules(1, 5);
        testResults.modules = {
          success: true,
          count: modulesResult.modules.length,
          total: modulesResult.total,
          data: modulesResult.modules.slice(0, 2)
        };
        console.log('✅ Modules service success:', modulesResult);
      } catch (error) {
        testResults.modules = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        console.error('❌ Modules service failed:', error);
      }

      // Test 4: API routes
      console.log('🧪 Testing API routes...');
      try {
        const [coursesApiResponse, modulesApiResponse] = await Promise.all([
          fetch('/api/admin/modules/courses'),
          fetch('/api/admin/modules?page=1&limit=5')
        ]);

        testResults.coursesApi = {
          status: coursesApiResponse.status,
          success: coursesApiResponse.ok,
          data: coursesApiResponse.ok ? await coursesApiResponse.json() : null
        };

        testResults.modulesApi = {
          status: modulesApiResponse.status,
          success: modulesApiResponse.ok,
          data: modulesApiResponse.ok ? await modulesApiResponse.json() : null
        };

        console.log('✅ API routes tested');
      } catch (error) {
        testResults.apiError = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ API routes failed:', error);
      }

    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }

    setResults(testResults);
    setLoading(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔧 Modules Debug Test</h1>
      <button onClick={runTests} disabled={loading} style={{ marginBottom: '20px', padding: '10px' }}>
        {loading ? 'Running Tests...' : 'Re-run Tests'}
      </button>

      <div style={{ display: 'grid', gap: '20px' }}>
        {/* Courses Service Test */}
        <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px' }}>
          <h3>📚 Courses Service (coursesService.getCourses)</h3>
          {results.courses ? (
            <div>
              <p><strong>Status:</strong> {results.courses.success ? '✅ Success' : '❌ Failed'}</p>
              {results.courses.success ? (
                <div>
                  <p><strong>Count:</strong> {results.courses.count} / {results.courses.total}</p>
                  <pre>{JSON.stringify(results.courses.data, null, 2)}</pre>
                </div>
              ) : (
                <p><strong>Error:</strong> {results.courses.error}</p>
              )}
            </div>
          ) : (
            <p>⏳ Testing...</p>
          )}
        </div>

        {/* Courses for Select Test */}
        <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px' }}>
          <h3>📋 Courses for Select (moduleService.getCoursesForSelect)</h3>
          {results.coursesForSelect ? (
            <div>
              <p><strong>Status:</strong> {results.coursesForSelect.success ? '✅ Success' : '❌ Failed'}</p>
              {results.coursesForSelect.success ? (
                <div>
                  <p><strong>Count:</strong> {results.coursesForSelect.count}</p>
                  <pre>{JSON.stringify(results.coursesForSelect.data, null, 2)}</pre>
                </div>
              ) : (
                <p><strong>Error:</strong> {results.coursesForSelect.error}</p>
              )}
            </div>
          ) : (
            <p>⏳ Testing...</p>
          )}
        </div>

        {/* Modules Service Test */}
        <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px' }}>
          <h3>📦 Modules Service (moduleService.getModules)</h3>
          {results.modules ? (
            <div>
              <p><strong>Status:</strong> {results.modules.success ? '✅ Success' : '❌ Failed'}</p>
              {results.modules.success ? (
                <div>
                  <p><strong>Count:</strong> {results.modules.count} / {results.modules.total}</p>
                  <pre>{JSON.stringify(results.modules.data, null, 2)}</pre>
                </div>
              ) : (
                <p><strong>Error:</strong> {results.modules.error}</p>
              )}
            </div>
          ) : (
            <p>⏳ Testing...</p>
          )}
        </div>

        {/* API Routes Test */}
        <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px' }}>
          <h3>🌐 API Routes</h3>
          {results.coursesApi || results.modulesApi ? (
            <div>
              <h4>Courses API (/api/admin/modules/courses)</h4>
              <p><strong>Status:</strong> {results.coursesApi?.status} {results.coursesApi?.success ? '✅' : '❌'}</p>
              {results.coursesApi?.data && <pre>{JSON.stringify(results.coursesApi.data.slice(0, 2), null, 2)}</pre>}
              
              <h4>Modules API (/api/admin/modules)</h4>
              <p><strong>Status:</strong> {results.modulesApi?.status} {results.modulesApi?.success ? '✅' : '❌'}</p>
              {results.modulesApi?.data && <pre>{JSON.stringify(results.modulesApi.data, null, 2)}</pre>}
            </div>
          ) : (
            <p>⏳ Testing...</p>
          )}
        </div>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <h3>📝 Instructions</h3>
        <p>1. Open browser console (F12) to see detailed logs</p>
        <p>2. Check which tests pass/fail to identify the root cause</p>
        <p>3. If direct service calls work but API routes fail, the issue is server-side authentication</p>
        <p>4. If direct service calls also fail, the issue is RLS policies or client-side authentication</p>
      </div>
    </div>
  );
}