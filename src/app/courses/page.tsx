import React, { Suspense } from "react";
import Link from "next/link";
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { createClient } from '@/lib/supabase/server';
import CoursesClient from './courses-client';
import { Navigation } from '@/components/navigation';

// Force dynamic rendering for this page since it uses authentication
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Course {
  id: string;
  title: string;
  description: string;
  cover_image: string | null;
  created_at: string;
}

interface CoursesData {
  isAuthenticated: boolean;
  user?: any;
  userRole?: string;
  courses: Course[];
  enrolledCourses: Course[];
}

// Server-side data fetching - using API to bypass RLS issues
async function getCoursesData(): Promise<CoursesData> {
  try {
    const supabase = await createClient();
    
    // Get current user info
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    // Fetch courses via API (bypasses RLS completely)
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000';
    const coursesResponse = await fetch(`${baseUrl}/api/courses/public`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!coursesResponse.ok) {
      throw new Error(`API request failed: ${coursesResponse.status}`);
    }
    
    const coursesData = await coursesResponse.json();
    
    const courses = coursesData.courses || [];

    if (!coursesData.success) {
      console.error('Error fetching courses via API:', coursesData.error);
      return {
        isAuthenticated: !!authUser,
        user: authUser,
        userRole: 'user',
        courses: [],
        enrolledCourses: [],
      };
    }

    // Process user info (we already have authUser from above)
    let user = authUser;
    let isAuthenticated = !!authUser;
    let userRole = 'user';
    let enrolledCourses: Course[] = [];

    if (authUser) {
      try {
        // Try to get user profile for role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authUser.id)
          .single();
        
        if (profile?.role) {
          userRole = profile.role;
        }
      } catch (profileError) {
        console.warn('Could not fetch user role:', profileError);
      }

      // Try to get enrolled courses
      try {
        const { data: enrollmentsData } = await supabase
          .from('course_enrollments')
          .select(`
            courses!inner (
              id,
              title,
              description,
              cover_image,
              created_at
            )
          `)
          .eq('user_id', authUser.id);

        enrolledCourses = enrollmentsData?.map((e: any) => e.courses).filter(Boolean) || [];
      } catch (enrollError) {
        console.warn('Could not fetch enrolled courses:', enrollError);
      }
    }

    return {
      isAuthenticated,
      user,
      userRole,
      courses: courses || [],
      enrolledCourses,
    };
  } catch (error) {
    console.error('Critical error in getCoursesData:', error);
    return {
      isAuthenticated: false,
      user: null,
      userRole: 'user',
      courses: [],
      enrolledCourses: [],
    };
  }
}

// Loading skeleton component
function CoursesSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-gray-200 h-48 rounded-t-xl" />
          <div className="bg-white p-6 rounded-b-xl shadow-lg">
            <div className="h-6 bg-gray-200 rounded mb-4" />
            <div className="h-4 bg-gray-200 rounded mb-2" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Using unified Navigation component



export default async function AllCoursesPage() {
  const data = await getCoursesData();

  return (
    <main className="min-h-screen flex flex-col items-center relative overflow-hidden bg-white">
      <div className="flex-1 w-full flex flex-col items-center relative z-10">
  <Navigation />

        <div className="w-full max-w-7xl px-6 py-12">
          <div className="animate-in fade-in duration-700">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              All <span className="text-blue-600">Courses</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              {data.isAuthenticated ? 'Browse and manage your learning journey' : 'Explore our comprehensive collection of courses'}
            </p>
          </div>

          <Suspense fallback={<CoursesSkeleton />}>
            <CoursesClient initialData={data} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
