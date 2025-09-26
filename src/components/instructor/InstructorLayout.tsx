import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface InstructorLayoutProps {
  children: React.ReactNode;
  showAdminLink?: boolean;
}

export default function InstructorLayout({ children, showAdminLink = false }: InstructorLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Instructor Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              {showAdminLink && (
                <Link href="/admin">
                  <Button variant="outline" size="sm">
                    Admin Dashboard
                  </Button>
                </Link>
              )}
              <Link href="/">
                <Button variant="outline" size="sm">
                  Back to Site
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}