'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogoutButton } from '@/components/logout-button';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

interface NavigationProps {
  className?: string;
}

export function Navigation({ className = '' }: NavigationProps) {
  const { user, role, isLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Close mobile menu on route change (best effort) and on resize to md+
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Mount flag for portal and scroll lock when drawer open
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const body = document.body;
    if (mobileOpen) {
      const prev = body.style.overflow;
      body.style.overflow = 'hidden';
      return () => { body.style.overflow = prev; };
    }
  }, [mobileOpen, mounted]);

  const getDashboardLink = () => {
    switch (role) {
      case 'admin':
        return '/admin';
      case 'instructor':
        return '/instructor';
      default:
        return '/dashboard';
    }
  };

  const getDashboardLabel = () => {
    switch (role) {
      case 'admin':
        return 'Admin Dashboard';
      case 'instructor':
        return 'Instructor Dashboard';
      default:
        return 'My Learning';
    }
  };

  return (
    <nav className={`w-full flex justify-center h-16 md:h-20 shadow-md bg-gradient-to-r from-blue-600 via-blue-500 to-blue-700 sticky top-0 z-50 backdrop-blur-lg bg-opacity-95 ${className}`}>
      <div className="w-full max-w-7xl flex justify-between items-center px-4 md:px-6 text-sm">
        {/* Logo */}
        <div className="flex items-center h-full">
          <Link href="/" className="flex items-center gap-3 group h-full transition-transform hover:scale-105">
            <span className="flex items-center gap-3 font-bold text-lg bg-transparent border-none shadow-none cursor-pointer select-none focus:outline-none h-full">
              <span className="flex items-center h-10 w-10 md:h-12 md:w-12 rounded-full bg-white p-2 shadow-lg group-hover:shadow-xl transition-shadow">
                <img src="/assets/roben-logo.png" alt="RobEn Logo" className="h-full w-full object-contain" />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="font-extrabold text-xl md:text-2xl text-white tracking-wide">RobEn</span>
                <span className="font-semibold text-[10px] md:text-sm text-blue-100 tracking-wide">Learning Hub</span>
              </span>
            </span>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-white hover:text-blue-100 font-semibold transition-colors">Home</Link>
          <Link href="/about" className="text-white hover:text-blue-100 font-semibold transition-colors">About</Link>
          <Link href="/courses" className="text-white hover:text-blue-100 font-semibold transition-colors">Courses</Link>
          <Link href="/contact" className="text-white hover:text-blue-100 font-semibold transition-colors">Contact</Link>

          {/* Authentication State */}
          {isLoading ? (
            <div className="flex gap-2">
              <div className="animate-pulse bg-white bg-opacity-20 h-8 w-20 rounded"></div>
              <div className="animate-pulse bg-white bg-opacity-20 h-8 w-16 rounded"></div>
            </div>
          ) : user ? (
            <div className="flex items-center gap-4">
              <Button asChild size="sm" variant="outline" className="bg-white text-blue-600 border-white hover:bg-blue-50">
                <Link href={getDashboardLink()}>{getDashboardLabel()}</Link>
              </Button>
              <LogoutButton />
            </div>
          ) : (
            <div className="flex gap-2">
              <Button asChild size="sm" className="bg-white text-blue-600 hover:bg-blue-50">
                <Link href="/auth">Sign in</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-white"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Navigation Drawer rendered via portal to avoid clipping by nav backdrop */}
      {mounted && createPortal(
        (
          <AnimatePresence>
            {mobileOpen && (
              <>
                {/* Backdrop */}
                <motion.button
                  aria-label="Close navigation menu"
                  className="md:hidden fixed inset-0 bg-black/40 z-[100]"
                  onClick={() => setMobileOpen(false)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
                {/* Drawer */}
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  id="mobile-nav"
                  className="md:hidden fixed inset-y-0 right-0 z-[110] w-72 max-w-[85vw] bg-gradient-to-b from-blue-700 to-blue-600 shadow-2xl border-l border-blue-500 flex flex-col"
                  initial={{ x: 320 }}
                  animate={{ x: 0 }}
                  exit={{ x: 320 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="px-4 py-4 flex-1 overflow-auto">
                    <div className="space-y-3">
                      <Link href="/" className="block text-white font-semibold" onClick={() => setMobileOpen(false)}>Home</Link>
                      <Link href="/about" className="block text-white font-semibold" onClick={() => setMobileOpen(false)}>About</Link>
                      <Link href="/courses" className="block text-white font-semibold" onClick={() => setMobileOpen(false)}>Courses</Link>
                      <Link href="/contact" className="block text-white font-semibold" onClick={() => setMobileOpen(false)}>Contact</Link>
                    </div>

                    {/* Auth area */}
                    <div className="pt-4 mt-4 border-t border-blue-500">
                      {isLoading ? (
                        <div className="flex gap-2">
                          <div className="animate-pulse bg-white/20 h-8 w-24 rounded" />
                          <div className="animate-pulse bg-white/20 h-8 w-16 rounded" />
                        </div>
                      ) : user ? (
                        <div className="flex items-center gap-2">
                          <Button asChild size="sm" variant="secondary" className="bg-white text-blue-600 hover:bg-blue-50 w-full justify-center">
                            <Link href={getDashboardLink()} onClick={() => setMobileOpen(false)}>{getDashboardLabel()}</Link>
                          </Button>
                          <LogoutButton />
                        </div>
                      ) : (
                        <Button asChild size="sm" className="bg-white text-blue-600 hover:bg-blue-50 w-full justify-center">
                          <Link href="/auth" onClick={() => setMobileOpen(false)}>Sign in</Link>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Footer area (optional) */}
                  <div className="p-3 border-t border-blue-500 text-blue-100 text-xs">© RobEn Learning Hub</div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        ),
        document.body
      )}
    </nav>
  );
}