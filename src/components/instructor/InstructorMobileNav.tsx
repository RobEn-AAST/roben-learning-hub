'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Video,
  ClipboardCheck,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const navItems = [
  { href: '/instructor', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/instructor/courses', label: 'My Courses', icon: BookOpen },
  { href: '/instructor/videos', label: 'Videos', icon: Video },
  { href: '/instructor/submissions', label: 'Submissions', icon: ClipboardCheck },
];

export function InstructorMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      {/* Mobile header */}
      <div className="flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200">
        <Link href="/instructor" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <span className="text-lg font-semibold text-gray-900">Instructor</span>
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
              item.href === '/instructor'
                ? pathname === '/instructor'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
