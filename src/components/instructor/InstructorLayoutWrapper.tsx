import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { isUserAdmin } from '@/utils/auth';
import InstructorLayout from '@/components/instructor/InstructorLayout';

interface InstructorLayoutWrapperProps {
  children: React.ReactNode;
}

export default async function InstructorLayoutWrapper({ children }: InstructorLayoutWrapperProps) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if user is admin to show admin dashboard link
  const isAdmin = user ? await isUserAdmin(user.id) : false;

  return (
    <InstructorLayout showAdminLink={isAdmin}>
      {children}
    </InstructorLayout>
  );
}