'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  ScrollText,
  ClipboardCheck,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/courses', label: 'Courses', icon: BookOpen },
  { href: '/admin/submissions', label: 'Submissions', icon: ClipboardCheck },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/logs', label: 'Logs', icon: ScrollText },
];

export function AdminMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      {/* Mobile header */}
      <div className="flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200">
        <Link href="/admin" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <span className="text-lg font-semibold text-gray-900">Admin</span>
        </Link>
        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav className="bg-white border-b border-gray-200 px-4 py-2 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <a
            href={
              process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('supabase.co')
                ? `https://supabase.com/dashboard/project/${process.env.NEXT_PUBLIC_SUPABASE_URL.split('.')[0].replace('https://', '')}`
                : 'http://127.0.0.1:55423'
            }
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <ExternalLink className="h-5 w-5" />
            <span>Supabase Studio</span>
          </a>
        </nav>
      )}
    </div>
  );
}
