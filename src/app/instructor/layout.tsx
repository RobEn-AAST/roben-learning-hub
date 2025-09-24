import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isUserInstructor } from '@/utils/auth';

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

  return <>{children}</>;
}