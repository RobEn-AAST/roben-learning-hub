import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isUserInstructor } from '@/utils/auth';
import { InstructorSidebar } from '@/components/instructor/InstructorSidebar';
import { InstructorMobileNav } from '@/components/instructor/InstructorMobileNav';

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

  const hasInstructorAccess = await isUserInstructor(user.id);

  if (!hasInstructorAccess) {
    redirect('/auth/error?message=Access denied. Instructor privileges required.');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar (desktop) */}
      <InstructorSidebar />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile nav */}
        <InstructorMobileNav />

        {/* Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
