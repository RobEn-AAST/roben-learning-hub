'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AdminDebugInfo {
  user: any;
  profile: any;
  isAdmin: boolean;
  error?: string;
}

export default function AdminDebugPage() {
  const [debugInfo, setDebugInfo] = useState<AdminDebugInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadDebugInfo = async () => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        setDebugInfo({ user: null, profile: null, isAdmin: false, error: userError.message });
        return;
      }

      // Get profile if user exists
      let profile = null;
      let profileError = null;
      let isAdmin = false;
      
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        profile = data;
        profileError = error;
        isAdmin = data?.role === 'admin';
      }

      setDebugInfo({ 
        user, 
        profile, 
        isAdmin,
        error: profileError?.message 
      });
    } catch (err) {
      setDebugInfo({ 
        user: null, 
        profile: null, 
        isAdmin: false,
        error: err instanceof Error ? err.message : 'Unknown error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const makeAdmin = async () => {
    if (!debugInfo?.user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', debugInfo.user.id);

      if (error) {
        alert('Error making user admin: ' + error.message);
      } else {
        alert('User made admin successfully!');
        loadDebugInfo(); // Refresh data
      }
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  useEffect(() => {
    loadDebugInfo();
  }, []);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-bold">Admin Access Debug</h1>
      
      <div className="flex gap-4">
        <Button onClick={loadDebugInfo}>Refresh Data</Button>
        {debugInfo?.user && !debugInfo.isAdmin && (
          <Button onClick={makeAdmin} variant="outline">
            Make Me Admin
          </Button>
        )}
        {debugInfo?.isAdmin && (
          <Button asChild>
            <a href="/admin">Go to Admin Dashboard</a>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle>Auth User</CardTitle>
          </CardHeader>
          <CardContent>
            {debugInfo?.user ? (
              <div className="space-y-2">
                <p><strong>ID:</strong> {debugInfo.user.id}</p>
                <p><strong>Email:</strong> {debugInfo.user.email}</p>
                <p><strong>Confirmed:</strong> {debugInfo.user.email_confirmed_at ? 'Yes' : 'No'}</p>
                <p><strong>Created:</strong> {new Date(debugInfo.user.created_at).toLocaleString()}</p>
              </div>
            ) : (
              <p className="text-red-500">No user logged in</p>
            )}
          </CardContent>
        </Card>

        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle>Profile & Admin Status</CardTitle>
          </CardHeader>
          <CardContent>
            {debugInfo?.profile ? (
              <div className="space-y-2">
                <p><strong>Full Name:</strong> {debugInfo.profile.full_name || '(empty)'}</p>
                <p><strong>Email:</strong> {debugInfo.profile.email}</p>
                <p><strong>Role:</strong> <span className={debugInfo.profile.role === 'admin' ? 'text-green-600 font-bold' : 'text-blue-600'}>{debugInfo.profile.role}</span></p>
                <p><strong>Bio:</strong> {debugInfo.profile.bio || '(empty)'}</p>
                <p><strong>Is Admin:</strong> <span className={debugInfo.isAdmin ? 'text-green-600 font-bold' : 'text-red-600'}>{debugInfo.isAdmin ? 'YES' : 'NO'}</span></p>
              </div>
            ) : debugInfo?.error ? (
              <div>
                <p className="text-red-500 mb-2">Profile Error:</p>
                <p className="text-sm bg-red-100 p-2 rounded">{debugInfo.error}</p>
              </div>
            ) : (
              <p className="text-yellow-600">No profile found</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Admin Access Test */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Access Test</CardTitle>
        </CardHeader>
        <CardContent>
          {debugInfo?.isAdmin ? (
            <div className="bg-green-100 border border-green-300 rounded-lg p-4">
              <p className="text-green-800 font-medium">✅ You should have admin access!</p>
              <p className="text-green-700 text-sm mt-1">Try accessing /admin - it should work now.</p>
            </div>
          ) : (
            <div className="bg-red-100 border border-red-300 rounded-lg p-4">
              <p className="text-red-800 font-medium">❌ No admin access</p>
              <p className="text-red-700 text-sm mt-1">Your role is: {debugInfo?.profile?.role || 'unknown'}</p>
              <p className="text-red-700 text-sm">Click "Make Me Admin" to grant admin privileges.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
