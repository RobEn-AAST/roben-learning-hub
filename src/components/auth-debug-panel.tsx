'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function AuthDebugPanel() {
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        let info = '';
        
        // 1. Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        info += `1. AUTH STATUS:\n`;
        info += `   User: ${user ? `${user.email} (${user.id})` : 'Not logged in'}\n`;
        info += `   Error: ${authError ? authError.message : 'None'}\n\n`;

        if (user) {
          // 2. Check profile
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          info += `2. PROFILE STATUS:\n`;
          info += `   Profile: ${profileData ? 'Found' : 'Not found'}\n`;
          info += `   Name: ${profileData?.full_name || 'Not set'}\n`;
          info += `   Role: ${profileData?.role || 'Not set'}\n`;
          info += `   Error: ${profileError ? profileError.message : 'None'}\n\n`;

          // 3. Try to get courses count
          const { count, error: coursesError } = await supabase
            .from('courses')
            .select('*', { count: 'exact', head: true });
          
          info += `3. COURSES ACCESS:\n`;
          info += `   Count: ${count !== null ? count : 'Failed to get count'}\n`;
          info += `   Error: ${coursesError ? coursesError.message : 'None'}\n\n`;

          // 4. RLS Status
          info += `4. NEXT STEPS:\n`;
          if (!user) {
            info += `   • You need to log in first\n`;
          } else if (!profileData) {
            info += `   • You need a profile in the profiles table\n`;
          } else if (!profileData.role) {
            info += `   • Your profile needs a role (admin, instructor, or student)\n`;
          } else if (count === null) {
            info += `   • RLS policies might be blocking access\n`;
            info += `   • Run the DEBUG_USER_ACCESS.sql script in Supabase\n`;
          } else {
            info += `   • Everything looks good! Courses should be visible.\n`;
          }
        }
        
        setDebugInfo(info);
      } catch (err) {
        setDebugInfo(`ERROR: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return <div className="p-4 bg-blue-50 border rounded">Loading auth debug info...</div>;
  }

  return (
    <div className="p-4 bg-gray-50 border rounded">
      <h3 className="font-bold text-lg mb-3">Authentication Debug Panel</h3>
      <pre className="text-sm bg-white p-3 border rounded overflow-auto whitespace-pre-wrap">
        {debugInfo}
      </pre>
    </div>
  );
}