'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogoutButton } from '@/components/logout-button';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

interface NavigationProps {
  user?: User | null;
  userRole?: string;
  className?: string;
}

export function Navigation({ className = '' }: NavigationProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null); // Start as null to prevent flickering
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;
    
    // Timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    }, 2000);
    
    // Get initial user and role together
    const fetchUserAndRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (isMounted) {
          setUser(user);
          
          if (user) {
            // Fetch role immediately with user
            const { data } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', user.id)
              .maybeSingle();
            
            if (isMounted) {
              setUserRole(data?.role || 'user');
            }
          } else {
            setUserRole('user');
          }
          
          setIsLoading(false);
          clearTimeout(timeoutId);
        }
      } catch {
        if (isMounted) {
          setUser(null);
          setUserRole('user');
          setIsLoading(false);
          clearTimeout(timeoutId);
        }
      }
    };

    fetchUserAndRole();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserRole('user');
      } else if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setUserRole(null); // Reset to null while fetching
        
        // Fetch role for new user
        const fetchNewRole = async () => {
          try {
            const { data } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .maybeSingle();
            
            if (isMounted) {
              setUserRole(data?.role || 'user');
            }
          } catch {
            if (isMounted) {
              setUserRole('user');
            }
          }
        };
        
        fetchNewRole();
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const getDashboardLink = () => {
    switch (userRole) {
      case 'admin':
        return '/admin';
      case 'instructor':
        return '/instructor';
      default:
        return '/dashboard';
    }
  };

  const getDashboardLabel = () => {
    switch (userRole) {
      case 'admin':
        return 'Admin Dashboard';
      case 'instructor':
        return 'Instructor Dashboard';
      default:
        return 'My Learning';
    }
  };

  // Don't show dashboard button until role is determined
  const shouldShowDashboard = user && userRole !== null;

  return (
    <nav className={`w-full flex justify-center h-20 shadow-md bg-gradient-to-r from-blue-600 via-blue-500 to-blue-700 sticky top-0 z-50 backdrop-blur-lg bg-opacity-95 ${className}`}>
      <div className="w-full max-w-7xl flex justify-between items-center px-6 text-sm">
        {/* Logo */}
        <div className="flex items-center h-full">
          <Link href="/" className="flex items-center gap-3 group h-full transition-transform hover:scale-105">
            <span className="flex items-center gap-3 font-bold text-lg bg-transparent border-none shadow-none cursor-pointer select-none focus:outline-none h-full">
              <span className="flex items-center h-12 w-12 rounded-full bg-white p-2 shadow-lg group-hover:shadow-xl transition-shadow">
                <img src="/assets/roben-logo.png" alt="RobEn Logo" className="h-full w-full object-contain" />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="font-extrabold text-2xl text-white tracking-wide">RobEn</span>
                <span className="font-semibold text-sm text-blue-100 tracking-wide">Learning Hub</span>
              </span>
            </span>
          </Link>
        </div>
        
        {/* Navigation Links */}
        <div className="flex items-center gap-6">
          <Link href="/" className="text-white hover:text-blue-100 font-semibold transition-colors">
            Home
          </Link>
          <Link href="/about" className="text-white hover:text-blue-100 font-semibold transition-colors">
            About
          </Link>
          <Link href="/courses" className="text-white hover:text-blue-100 font-semibold transition-colors">
            Courses
          </Link>
          <Link href="/contact" className="text-white hover:text-blue-100 font-semibold transition-colors">
            Contact
          </Link>
          
          {/* Authentication State */}
          {isLoading ? (
            <div className="flex gap-2">
              <div className="animate-pulse bg-white bg-opacity-20 h-8 w-20 rounded"></div>
              <div className="animate-pulse bg-white bg-opacity-20 h-8 w-16 rounded"></div>
            </div>
          ) : user ? (
            <div className="flex items-center gap-4">
              {shouldShowDashboard && (
                <Button asChild size="sm" variant="outline" className="bg-white text-blue-600 border-white hover:bg-blue-50">
                  <Link href={getDashboardLink()}>{getDashboardLabel()}</Link>
                </Button>
              )}
              <LogoutButton />
            </div>
          ) : (
            <div className="flex gap-2">
              <Button asChild size="sm" variant="outline" className="bg-white text-blue-600 border-white hover:bg-blue-50">
                <Link href="/auth?mode=login">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="bg-white text-blue-600 hover:bg-blue-50">
                <Link href="/auth?mode=signup">Sign up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}