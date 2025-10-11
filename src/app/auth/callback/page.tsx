import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function AuthCallbackPage() {
  const supabase = await createClient();
  
  try {
    // Get the current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      // User is logged in, check if they need to complete profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single();
      
      if (!profile || !profile.full_name || profile.full_name.trim() === '') {
        // Redirect to complete profile
        redirect('/complete-profile');
      } else {
        // Profile is complete, redirect to home
        redirect('/');
      }
    } else {
      // No session, redirect to login
      redirect('/auth?mode=login');
    }
  } catch (error) {
    console.error('Auth callback error:', error);
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <Card className="w-full max-w-md bg-white">
          <CardHeader>
            <CardTitle className="text-gray-900">Authentication Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              There was an issue with your authentication. Please try signing in again.
            </p>
            <div className="flex gap-2">
              <Button asChild className="flex-1">
                <Link href="/auth?mode=login">Sign In</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/">Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}
