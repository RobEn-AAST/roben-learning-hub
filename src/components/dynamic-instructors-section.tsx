'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import Image from 'next/image';

interface Instructor {
  id: string;
  // New schema fields
  first_name?: string | null;
  last_name?: string | null;
  // Keep full_name for backward compatibility
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
}

export function DynamicInstructorsSection() {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInstructors() {
      try {
        const response = await fetch('/api/landing');
        const data = await response.json();
        setInstructors(data.instructors || []);
      } catch (error) {
        console.error('Error fetching instructors:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchInstructors();
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
    hidden: { opacity: 0, scale: 0.98 },
    visible: {
      opacity: 1,
      scale: 1,
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
              Loading Instructors...
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-white p-8 rounded-xl shadow-lg">
                  <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto mb-4" />
                  <div className="h-6 bg-gray-200 rounded mb-3" />
                  <div className="h-4 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const getInitials = (name?: string | null) => {
    if (!name) return '';
    return name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => n[0] || '')
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getDisplayName = (instructor: Instructor) => {
    // Prefer full_name (backwards compatibility), otherwise combine first and last name
    const full = instructor.full_name;
    if (full && full.trim()) return full.trim();

    const first = instructor.first_name?.trim() || '';
    const last = instructor.last_name?.trim() || '';
    const combined = `${first} ${last}`.trim();
    if (combined) return combined;

    // fallback to email or empty string
    return instructor.email || '';
  };

  return (
    <section className="w-full py-20 bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Meet Our <span className="text-blue-600">Expert Instructors</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Learn from industry professionals who are passionate about sharing their knowledge
          </p>
        </motion.div>

        {instructors.length > 0 ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {instructors.map((instructor) => (
              <motion.div
                key={instructor.id}
                variants={itemVariants}
                className="group"
              >
                <div className="bg-white rounded-xl shadow-lg p-8 text-center transition-all duration-300 border border-gray-100">
                  {/* Avatar */}
                  <div className="relative mb-6">
                          {instructor.avatar_url ? (
                      <div className="relative w-32 h-32 mx-auto">
                        <Image
                          src={instructor.avatar_url}
                          alt={getDisplayName(instructor) || 'Instructor'}
                          fill
                          className="rounded-full object-cover border-4 border-blue-200 transition-colors"
                        />
                      </div>
                    ) : (
                      <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-4 border-blue-200 transition-all">
                          <span className="text-4xl font-bold text-white">
                          {getInitials(getDisplayName(instructor))}
                        </span>
                      </div>
                    )}
                    <div
                      className="absolute -bottom-2 -right-2 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg"
                    >
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Info */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-2 transition-colors">
                    {getDisplayName(instructor) || 'Instructor'}
                  </h3>
                  
                  {instructor.bio ? (
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {instructor.bio}
                    </p>
                  ) : (
                    <p className="text-gray-600 mb-4">
                      Expert instructor at RobEn Learning Hub
                    </p>
                  )}


                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600">
              Our instructors will be announced soon!
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
