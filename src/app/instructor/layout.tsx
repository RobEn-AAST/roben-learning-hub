import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { LogoutButton } from '@/components/logout-button';
import { isUserInstructor } from '@/utils/auth';

// Export dynamic rendering configuration for instructor authentication
export const dynamic = 'force-dynamic';

interface InstructorLayoutProps {
  children: React.ReactNode;
}

export default async function InstructorLayout({ children }: InstructorLayoutProps) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Check if user has instructor or admin role
  const hasInstructorAccess = await isUserInstructor(user.id);
  
  if (!hasInstructorAccess) {
    redirect('/auth/error?message=Access denied. Instructor privileges required.');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Instructor Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/instructor" className="text-xl font-semibold text-gray-900">
                Instructor Dashboard
              </Link>
              <nav className="hidden md:flex space-x-6">
                <Link 
                  href="/instructor" 
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/instructor/videos" 
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Videos
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="outline" size="sm">
                  Back to Site
                </Button>
              </Link>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Instructor Content */}
      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}