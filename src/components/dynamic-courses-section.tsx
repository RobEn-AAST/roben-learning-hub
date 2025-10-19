'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Course {
  id: string;
  title: string;
  description: string;
  cover_image: string | null;
  created_at: string;
}

export function DynamicCoursesSection() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showingEnrolled, setShowingEnrolled] = useState(false);

  useEffect(() => {
    async function fetchCourses() {
      try {
        const response = await fetch('/api/landing');
        const data = await response.json();
        setCourses(data.courses || []);
        setEnrolledCourses(data.enrolledCourses || []);
        setIsAuthenticated(data.isAuthenticated || false);
        
        // If user is logged in and has enrolled courses, show them by default
        if (data.isAuthenticated && data.enrolledCourses && data.enrolledCourses.length > 0) {
          setShowingEnrolled(true);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCourses();
  }, []);

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
      <section className="w-full py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Loading Courses...
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
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
        </div>
      </section>
    );
  }

  const displayCourses = showingEnrolled ? enrolledCourses : courses;

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
            {isAuthenticated && showingEnrolled ? (
              <>Your <span className="text-blue-600">Enrolled Courses</span></>
            ) : (
              <>Our <span className="text-blue-600">Courses</span></>
            )}
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {isAuthenticated && showingEnrolled
              ? 'Continue your learning journey with your enrolled courses'
              : 'Explore our comprehensive collection of courses designed to help you master new skills'}
          </p>
          
          {/* Toggle buttons for authenticated users with enrolled courses */}
          {isAuthenticated && enrolledCourses.length > 0 && (
            <div className="flex justify-center gap-4 mt-6">
              <motion.button
                onClick={() => setShowingEnrolled(true)}
                className={`px-6 py-2 rounded-lg font-semibold transition-all duration-300 ${
                  showingEnrolled
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white text-blue-600 border-2 border-blue-600'
                }`}
              >
                My Courses ({enrolledCourses.length})
              </motion.button>
              <motion.button
                onClick={() => setShowingEnrolled(false)}
                className={`px-6 py-2 rounded-lg font-semibold transition-all duration-300 ${
                  !showingEnrolled
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white text-blue-600 border-2 border-blue-600'
                }`}
              >
                All Courses ({courses.length})
              </motion.button>
            </div>
          )}
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
              {displayCourses.map((course, index) => (
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
                        {showingEnrolled && (
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
                          {isAuthenticated && showingEnrolled ? 'Continue Learning' : isAuthenticated ? 'Learn More' : 'Preview Course'}
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

            {!showingEnrolled && (
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
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600">
              {showingEnrolled
                ? "You haven't enrolled in any courses yet. Browse our courses to get started!"
                : 'No courses available at the moment. Check back soon!'}
            </p>
            {showingEnrolled && (
              <motion.button
                onClick={() => setShowingEnrolled(false)}
                className="mt-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Browse All Courses
              </motion.button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
