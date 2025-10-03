'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function SupabaseConnectionTest() {
  const [status, setStatus] = useState('Testing...');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function testConnection() {
      try {
        const supabase = createClient();
        
        // Test 1: Basic connection
        const { data, error } = await supabase.from('profiles').select('count').limit(1);
        
        if (error) {
          setStatus(`Connection Error: ${error.message}`);
          return;
        }

        // Test 2: Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          setStatus(`Auth Error: ${authError.message}`);
          return;
        }

        setUser(user);
        setStatus(user ? 'Connected & Authenticated' : 'Connected but not authenticated');
        
      } catch (err) {
        setStatus(`Unexpected Error: ${err}`);
      }
    }

    testConnection();
  }, []);

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="font-bold">Supabase Connection Status</h3>
      <p className="mt-2">Status: {status}</p>
      {user && (
        <div className="mt-2 text-sm">
          <p>User ID: {user.id}</p>
          <p>Email: {user.email}</p>
        </div>
      )}
    </div>
  );
}