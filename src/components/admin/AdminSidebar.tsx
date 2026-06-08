'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  ScrollText,
  ClipboardCheck,
  ExternalLink,
  LogOut,
  ArrowLeft,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useCallback } from 'react';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/courses', label: 'Courses', icon: BookOpen },
  { href: '/admin/submissions', label: 'Submissions', icon: ClipboardCheck },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/logs', label: 'Logs', icon: ScrollText },
];

const supabaseStudioUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('supabase.co')
    ? `https://supabase.com/dashboard/project/${process.env.NEXT_PUBLIC_SUPABASE_URL.split('.')[0].replace('https://', '')}`
    : 'http://127.0.0.1:55423';

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const toggle = useCallback(() => setCollapsed((c) => !c), []);

  return (
    <aside
      className={cn(
        'hidden md:flex md:flex-col bg-white border-r border-gray-200 min-h-screen transition-all duration-200',
        collapsed ? 'md:w-16' : 'md:w-64'
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center h-16 border-b border-gray-200 transition-all duration-200',
          collapsed ? 'px-3 justify-center' : 'px-6 justify-between'
        )}
      >
        <Link
          href="/admin"
          className={cn('flex items-center', collapsed ? '' : 'space-x-2')}
        >
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          {!collapsed && (
            <span className="text-lg font-semibold text-gray-900 whitespace-nowrap">
              RobEn Admin
            </span>
          )}
        </Link>
        <button
          onClick={toggle}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <ChevronsLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center rounded-lg text-sm font-medium transition-colors',
                collapsed
                  ? 'justify-center px-2 py-2.5'
                  : 'space-x-3 px-3 py-2',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon
                className={cn(
                  'h-5 w-5 flex-shrink-0',
                  isActive ? 'text-blue-700' : 'text-gray-400'
                )}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        <div className={cn('pt-4 mt-4 border-t border-gray-200')}>
          <a
            href={supabaseStudioUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={collapsed ? 'Supabase Studio' : undefined}
            className={cn(
              'flex items-center rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors',
              collapsed
                ? 'justify-center px-2 py-2.5'
                : 'space-x-3 px-3 py-2'
            )}
          >
            <ExternalLink className="h-5 w-5 text-gray-400 flex-shrink-0" />
            {!collapsed && <span>Supabase Studio</span>}
          </a>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-2 py-4 border-t border-gray-200 space-y-1">
        <Link
          href="/instructor"
          title={collapsed ? 'Instructor View' : undefined}
          className={cn(
            'flex items-center rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors',
            collapsed
              ? 'justify-center px-2 py-2.5'
              : 'space-x-3 px-3 py-2'
          )}
        >
          <BookOpen className="h-5 w-5 text-gray-400 flex-shrink-0" />
          {!collapsed && <span>Instructor View</span>}
        </Link>
        <Link
          href="/"
          title={collapsed ? 'Back to Site' : undefined}
          className={cn(
            'flex items-center rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors',
            collapsed
              ? 'justify-center px-2 py-2.5'
              : 'space-x-3 px-3 py-2'
          )}
        >
          <ArrowLeft className="h-5 w-5 text-gray-400 flex-shrink-0" />
          {!collapsed && <span>Back to Site</span>}
        </Link>
        <form action="/auth/logout" method="POST">
          <button
            type="submit"
            title={collapsed ? 'Sign Out' : undefined}
            className={cn(
              'flex items-center rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors w-full',
              collapsed
                ? 'justify-center px-2 py-2.5'
                : 'space-x-3 px-3 py-2'
            )}
          >
            <LogOut className="h-5 w-5 text-red-400 flex-shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </form>
      </div>
    </aside>
  );
}
