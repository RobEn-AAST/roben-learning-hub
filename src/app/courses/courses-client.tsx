'use client';

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Image from 'next/image';

interface Course {
  id: string;
  title: string;
  description: string;
  cover_image: string | null;
  created_at: string;
}

interface CoursesData {
  isAuthenticated: boolean;
  courses: Course[];
  enrolledCourses: Course[];
}

interface CoursesClientProps {
  initialData: CoursesData;
}

// Course card component (moved to client side)
function CourseCard({ course, isEnrolled, isAuthenticated }: { 
  course: Course; 
  isEnrolled: boolean; 
  isAuthenticated: boolean; 
}) {
  return (
    <Link href={`/courses/${course.id}`} className="block h-full">
      <div className="group bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl border border-gray-100 h-full flex flex-col hover:-translate-y-2 hover:scale-[1.02] cursor-pointer">
        <div className="relative h-48 bg-gradient-to-br from-blue-400 to-blue-600 overflow-hidden">
          {course.cover_image ? (
            <Image 
              src={course.cover_image} 
              alt={course.title} 
              fill 
              className="object-cover transition-transform duration-300 group-hover:scale-110" 
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-20 h-20 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          {isAuthenticated && isEnrolled && (
            <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
              Enrolled
            </div>
          )}
        </div>
        <div className="p-6 flex-1 flex flex-col">
          <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {course.title}
          </h3>
          <p className="text-gray-600 mb-4 line-clamp-3 flex-1">
            {course.description}
          </p>
          <div className="inline-flex items-center text-blue-600 font-semibold mt-auto">
            {isAuthenticated ? (isEnrolled ? 'Continue Learning' : 'View Course') : 'Preview Course'}
            <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function CoursesClient({ initialData }: CoursesClientProps) {
  const [filter, setFilter] = useState<'all' | 'enrolled' | 'available'>('all');
  const { isAuthenticated, courses, enrolledCourses } = initialData;

  // Memoize filtered courses for better performance
  const filteredCourses = useMemo(() => {
    if (filter === 'enrolled') {
      return enrolledCourses;
    }
    if (filter === 'available' && isAuthenticated) {
      const enrolledIds = new Set(enrolledCourses.map(c => c.id));
      return courses.filter(c => !enrolledIds.has(c.id));
    }
    return courses;
  }, [filter, courses, enrolledCourses, isAuthenticated]);

  // Memoize enrolled course IDs for performance
  const enrolledIds = useMemo(() => 
    new Set(enrolledCourses.map(c => c.id)), 
    [enrolledCourses]
  );

  return (
    <>
      {/* Filter buttons for authenticated users with enrolled courses */}
      {isAuthenticated && enrolledCourses.length > 0 && (
        <div className="flex flex-wrap gap-4 mb-8 animate-in slide-in-from-bottom-4 duration-500">
          <FilterButton
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            label={`All Courses (${courses.length})`}
          />
          <FilterButton
            active={filter === 'enrolled'}
            onClick={() => setFilter('enrolled')}
            label={`My Courses (${enrolledCourses.length})`}
          />
          <FilterButton
            active={filter === 'available'}
            onClick={() => setFilter('available')}
            label={`Available (${courses.length - enrolledCourses.length})`}
          />
        </div>
      )}

      {/* Courses grid */}
      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-700">
          {filteredCourses.map((course, index) => (
            <div 
              key={course.id} 
              className="animate-in slide-in-from-bottom-4 duration-500"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CourseCard 
                course={course} 
                isEnrolled={enrolledIds.has(course.id)} 
                isAuthenticated={isAuthenticated} 
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 animate-in fade-in duration-700">
          <div className="max-w-md mx-auto">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No courses found</h3>
            <p className="text-gray-600 mb-4">
              {filter === 'enrolled' 
                ? "You haven't enrolled in any courses yet." 
                : filter === 'available' 
                ? "No available courses at the moment. You've enrolled in all our courses!" 
                : 'No courses available at the moment. This could be because:'
              }
            </p>
            {filter !== 'enrolled' && filter !== 'available' && (
              <div className="text-left space-y-2 text-sm text-gray-500 mb-6">
                <p>• No courses have been created yet</p>
                <p>• Courses exist but aren't published</p>
                <p>• Database connection issue</p>
              </div>
            )}
            {filter !== 'enrolled' && filter !== 'available' && (
              <div className="space-y-3">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">🎓 Want to see some courses?</h4>
                  <p className="text-blue-700 text-sm mb-3">
                    It looks like no courses have been created yet. You can create some sample courses to get started!
                  </p>
                  <a 
                    href="/debug-courses" 
                    className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                  >
                    Create Sample Courses
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// Optimized filter button component
function FilterButton({ 
  active, 
  onClick, 
  label 
}: { 
  active: boolean; 
  onClick: () => void; 
  label: string; 
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-6 py-2 rounded-lg font-semibold transition-all duration-300 
        transform hover:scale-105 active:scale-95
        ${active 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' 
          : 'bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50'
        }
      `}
    >
      {label}
    </button>
  );
}