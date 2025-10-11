'use client';

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Button } from "@/components/ui/button";

interface Course {
  id: string;
  title: string;
  description: string;
  cover_image: string | null;
  created_at: string;
}

export default function AllCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'enrolled' | 'available'>('all');

  useEffect(() => {
    async function fetchCourses() {
      try {
        const response = await fetch('/api/landing');
        const data = await response.json();
        
        setCourses(data.courses || []);
        setEnrolledCourses(data.enrolledCourses || []);
        setIsAuthenticated(data.isAuthenticated || false);
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCourses();
  }, []);

  const getFilteredCourses = () => {
    if (filter === 'enrolled') {
      return enrolledCourses;
    }
    if (filter === 'available' && isAuthenticated) {
      const enrolledIds = enrolledCourses.map(c => c.id);
      return courses.filter(c => !enrolledIds.includes(c.id));
    }
    return courses;
  };

  const filteredCourses = getFilteredCourses();

  return (
    <main className="min-h-screen flex flex-col items-center relative overflow-hidden bg-white">
      <div className="flex-1 w-full flex flex-col items-center relative z-10">
        <nav className="w-full flex justify-center h-20 shadow-md bg-gradient-to-r from-blue-600 via-blue-500 to-blue-700 sticky top-0 z-50 backdrop-blur-lg bg-opacity-95">
          <div className="w-full max-w-7xl flex justify-between items-center px-6 text-sm">
            <div className="flex items-center h-full">
              <Link href="/" className="flex items-center gap-3 group h-full transition-transform hover:scale-105">
                <span className="flex items-center gap-3 font-bold text-lg bg-transparent border-none shadow-none cursor-pointer select-none focus:outline-none h-full">
                  <span className="flex items-center h-12 w-12 rounded-full bg-white p-2 shadow-lg group-hover:shadow-xl transition-shadow">
                    <img src="/assets/favicon.png" alt="favicon" className="h-full w-full object-contain" />
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="font-extrabold text-2xl text-white tracking-wide">RobEn</span>
                    <span className="font-semibold text-sm text-blue-100 tracking-wide">Learning Hub</span>
                  </span>
                </span>
              </Link>
            </div>
            
            <div className="flex items-center gap-6">
              <Link href="/" className="text-white hover:text-blue-100 font-semibold transition-colors">
                Home
              </Link>
              {isAuthenticated ? (
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline" className="bg-white text-blue-600 border-white hover:bg-blue-50">
                    <Link href="/students">My Dashboard</Link>
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline" className="bg-white text-blue-600 border-white hover:bg-blue-50">
                    <Link href="/auth/login">Sign in</Link>
                  </Button>
                  <Button asChild size="sm" className="bg-white text-blue-600 hover:bg-blue-50">
                    <Link href="/auth/sign-up">Sign up</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </nav>

        <div className="w-full max-w-7xl px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              All <span className="text-blue-600">Courses</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              {isAuthenticated ? 'Browse and manage your learning journey' : 'Explore our comprehensive collection of courses'}
            </p>

            {isAuthenticated && enrolledCourses.length > 0 && (
              <div className="flex flex-wrap gap-4 mb-8">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setFilter('all')} className={'px-6 py-2 rounded-lg font-semibold transition-all duration-300 ' + (filter === 'all' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-blue-600 border-2 border-blue-600')}>
                  All Courses ({courses.length})
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setFilter('enrolled')} className={'px-6 py-2 rounded-lg font-semibold transition-all duration-300 ' + (filter === 'enrolled' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-blue-600 border-2 border-blue-600')}>
                  My Courses ({enrolledCourses.length})
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setFilter('available')} className={'px-6 py-2 rounded-lg font-semibold transition-all duration-300 ' + (filter === 'available' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-blue-600 border-2 border-blue-600')}>
                  Available ({courses.length - enrolledCourses.length})
                </motion.button>
              </div>
            )}
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse"><div className="bg-gray-200 h-48 rounded-t-xl" /><div className="bg-white p-6 rounded-b-xl shadow-lg"><div className="h-6 bg-gray-200 rounded mb-4" /><div className="h-4 bg-gray-200 rounded mb-2" /><div className="h-4 bg-gray-200 rounded w-2/3" /></div></div>
              ))}
            </div>
          ) : filteredCourses.length > 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredCourses.map((course) => (
                <motion.div key={course.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -10, scale: 1.02 }} className="group">
                  <div className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 group-hover:shadow-2xl border border-gray-100 h-full flex flex-col">
                    <div className="relative h-48 bg-gradient-to-br from-blue-400 to-blue-600 overflow-hidden">
                      {course.cover_image ? (<Image src={course.cover_image} alt={course.title} fill className="object-cover transition-transform duration-300 group-hover:scale-110" />) : (<div className="w-full h-full flex items-center justify-center"><svg className="w-20 h-20 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg></div>)}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      {isAuthenticated && enrolledCourses.some(c => c.id === course.id) && (<div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">Enrolled</div>)}
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">{course.title}</h3>
                      <p className="text-gray-600 mb-4 line-clamp-3 flex-1">{course.description}</p>
                      {isAuthenticated ? (
                        <Link href={'/courses/' + course.id} className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-700 transition-colors mt-auto">
                          {enrolledCourses.some(c => c.id === course.id) ? 'Continue Learning' : 'View Course'}
                          <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </Link>
                      ) : (
                        <div className="mt-auto">
                          <Link href={'/courses/' + course.id} className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-700 transition-colors mb-3">
                            Preview Course
                            <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          </Link>
                          <div className="text-sm text-gray-500">
                            <Link href="/auth/sign-up" className="text-blue-600 hover:text-blue-700 font-medium">Sign up</Link> to enroll in this course
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-12">
              <p className="text-xl text-gray-600">
                {filter === 'enrolled' ? "You haven't enrolled in any courses yet." : filter === 'available' ? "No available courses at the moment. You've enrolled in all our courses!" : 'No courses available at the moment. Check back soon!'}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
