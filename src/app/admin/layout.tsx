import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isUserAdmin } from '@/utils/auth';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminMobileNav } from '@/components/admin/AdminMobileNav';

export const dynamic = 'force-dynamic';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const hasAdminRole = await isUserAdmin(user.id);

  if (!hasAdminRole) {
    redirect('/auth/error?message=Access denied. Admin privileges required.');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar (desktop) */}
      <AdminSidebar />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile nav */}
        <AdminMobileNav />

        {/* Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
