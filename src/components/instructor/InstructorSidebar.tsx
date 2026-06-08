'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Video,
  ClipboardCheck,
  ArrowLeft,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/instructor', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/instructor/courses', label: 'My Courses', icon: BookOpen },
  { href: '/instructor/videos', label: 'Videos', icon: Video },
  { href: '/instructor/submissions', label: 'Submissions', icon: ClipboardCheck },
];

export function InstructorSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 bg-white border-r border-gray-200 min-h-screen">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-gray-200">
        <Link href="/instructor" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <span className="text-lg font-semibold text-gray-900">Instructor</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === '/instructor'
              ? pathname === '/instructor'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive ? 'text-emerald-700' : 'text-gray-400')} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-200 space-y-1">
        <Link
          href="/"
          className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-400" />
          <span>Back to Site</span>
        </Link>
        <form action="/auth/logout" method="POST">
          <button
            type="submit"
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors w-full"
          >
            <LogOut className="h-5 w-5 text-red-400" />
            <span>Sign Out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
