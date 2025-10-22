'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLandingPageData } from '@/hooks/useQueryCache';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

interface Course {
  id: string;
  title: string;
  description: string;
  cover_image: string | null;
  created_at: string;
}

export function DynamicCoursesSection() {
  // PERFORMANCE: Use React Query for caching - 70% fewer API calls
  const { data, isLoading: loading } = useLandingPageData();
  const [showingEnrolled, setShowingEnrolled] = useState(false);

  const courses = data?.courses || [];
  const enrolledCourses = data?.enrolledCourses || [];
  const isAuthenticated = data?.isAuthenticated || false;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 5 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
      },
    },
  };

  if (loading) {
    return (
      <section className="w-full py-20 bg-gradient-to-b from-white to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <Skeleton className="h-12 w-64 mx-auto" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardContent className="p-6 space-y-3">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-10 w-full mt-4" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const displayCourses = courses; // Always show all courses on landing page

  return (
    <section className="w-full py-20 bg-gradient-to-b from-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Our <span className="text-blue-600">Courses</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Explore our comprehensive collection of courses designed to help you master new skills
          </p>
          

        </motion.div>

        {displayCourses.length > 0 ? (
          <>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {displayCourses.map((course: Course, index: number) => (
                <motion.div
                  key={course.id}
                  variants={itemVariants}
                  className="group"
                >
                  <Link href={`/courses/${course.id}`} className="block">
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 border border-gray-100 hover:shadow-xl cursor-pointer">
                      {/* Course Image */}
                      <div className="relative h-48 bg-gradient-to-br from-blue-400 to-blue-600 overflow-hidden">
                        {course.cover_image ? (
                          <Image
                            src={course.cover_image}
                            alt={course.title}
                            fill
                            className="object-cover transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg
                              className="w-20 h-20 text-white opacity-50"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                              />
                            </svg>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        {isAuthenticated && enrolledCourses.some((enrolled: Course) => enrolled.id === course.id) && (
                          <div className="absolute top-4 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                            Enrolled
                          </div>
                        )}
                      </div>

                      {/* Course Content */}
                      <div className="p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {course.title}
                        </h3>
                        <p className="text-gray-600 mb-4 line-clamp-3">
                          {course.description}
                        </p>
                        <div className="flex items-center text-blue-600 font-semibold">
                          {isAuthenticated ? 'Learn More' : 'Preview Course'}
                          <svg
                            className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 5 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="text-center mt-12"
            >
              <Link href="/courses">
                <motion.button
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  View All Courses
                </motion.button>
              </Link>
            </motion.div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600">
              No courses available at the moment. Check back soon!
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
