'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface UserInfo {
  user: any;
  profile: any;
  error?: string;
}

export default function DebugPage() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadUserInfo = async () => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        setUserInfo({ user: null, profile: null, error: userError.message });
        return;
      }

      // Get profile if user exists
      let profile = null;
      let profileError = null;
      
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        profile = data;
        profileError = error;
      }

      setUserInfo({ 
        user, 
        profile, 
        error: profileError?.message 
      });
    } catch (err) {
      setUserInfo({ 
        user: null, 
        profile: null, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async () => {
    if (!userInfo?.user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: userInfo.user.id,
          full_name: userInfo.user.user_metadata?.full_name || '',
          email: userInfo.user.email || '',
          role: 'student',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        alert('Error creating profile: ' + error.message);
      } else {
        alert('Profile created successfully!');
        loadUserInfo(); // Refresh data
      }
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  useEffect(() => {
    loadUserInfo();
  }, []);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-bold">User & Profile Debug</h1>
      
      <div className="flex gap-4">
        <Button onClick={loadUserInfo}>Refresh Data</Button>
        {userInfo?.user && !userInfo.profile && (
          <Button onClick={createProfile} variant="outline">
            Create Profile Manually
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
            {userInfo?.user ? (
              <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
                {JSON.stringify({
                  id: userInfo.user.id,
                  email: userInfo.user.email,
                  email_confirmed_at: userInfo.user.email_confirmed_at,
                  user_metadata: userInfo.user.user_metadata,
                  created_at: userInfo.user.created_at
                }, null, 2)}
              </pre>
            ) : (
              <p className="text-red-500">No user logged in</p>
            )}
          </CardContent>
        </Card>

        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            {userInfo?.profile ? (
              <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
                {JSON.stringify(userInfo.profile, null, 2)}
              </pre>
            ) : userInfo?.error ? (
              <div>
                <p className="text-red-500 mb-2">Profile Error:</p>
                <p className="text-sm bg-red-100 p-2 rounded">{userInfo.error}</p>
              </div>
            ) : (
              <p className="text-yellow-600">No profile found</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error Info */}
      {userInfo?.error && (
        <Card>
          <CardHeader>
            <CardTitle>Error Details</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{userInfo.error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
