'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

function StaticLogo() {
  // Mobile: gentle, smaller float with faster cycle, no overlap
  // Desktop/tablet: subtle floating animation with gentle glow
  return (
    <div className="flex justify-center lg:justify-end items-start mt-0 lg:-mt-8 w-full">
      {/* Mobile (sm:hidden): small, faster float; pointer-events-none so it never blocks clicks */}
      <motion.div
        className="sm:hidden relative w-48 h-48 pointer-events-none"
        animate={{ y: [-10, -22, -10] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <Image
          src="/assets/roben-logo.png"
          alt="RobEn Logo"
          fill
          sizes="(max-width: 640px) 192px, 192px"
          className="object-contain drop-shadow-xl"
          priority
        />
      </motion.div>

      {/* Tablet/Desktop: animated but subtle */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="hidden sm:flex justify-end items-start w-full pointer-events-none"
      >
        <motion.div
          animate={{ y: [-18, -34, -18] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="relative w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80"
        >
          {/* Animated background glow (hidden on md< for perf) */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full blur-3xl opacity-20 md:opacity-30 pointer-events-none"
            animate={{
              scale: [1, 1.06, 1],
              opacity: [0.2, 0.35, 0.2],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />

          <Image
            src="/assets/roben-logo.png"
            alt="RobEn Logo"
            fill
            sizes="(max-width: 768px) 288px, (max-width: 1024px) 320px, 320px"
            className="relative z-10 object-contain drop-shadow-2xl"
            priority
          />
        </motion.div>
      </motion.div>
    </div>
  );
}

export function EnhancedHero() {
  const { user, role, isLoading } = useAuth();

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
    <div className="relative w-full min-h-[80vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-white via-blue-50 to-blue-100">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Hide heavy blobs on small screens for performance */}
        <motion.div
          className="hidden sm:block absolute top-20 left-6 w-40 h-40 md:w-64 md:h-64 bg-blue-200 rounded-full mix-blend-multiply blur-xl opacity-25"
          animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="hidden sm:block absolute top-40 right-6 w-48 h-48 md:w-72 md:h-72 bg-blue-300 rounded-full mix-blend-multiply blur-xl opacity-25"
          animate={{ x: [0, -60, 0], y: [0, 80, 0] }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="hidden sm:block absolute -bottom-8 left-1/2 w-56 h-56 md:w-80 md:h-80 bg-blue-400 rounded-full mix-blend-multiply blur-xl opacity-15"
          animate={{ x: [0, 40, 0], y: [0, -40, 0] }}
          transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Text content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center lg:text-left"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 mb-6">
                Welcome to{' '}
                <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-700 bg-clip-text text-transparent">
                  RobEn
                </span>
              </h1>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-blue-600 mb-6">
                Learning Hub
              </h2>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="text-xl sm:text-2xl text-gray-700 mb-8 leading-relaxed"
            >
              Control your future with our comprehensive learning management platform
            </motion.p>

              {/* Mobile-first: show the logo before CTAs on small screens */}
              <div className="sm:hidden mb-6">
                <StaticLogo />
              </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <motion.a
                href="/courses"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Explore Courses
              </motion.a>
            </motion.div>
          </motion.div>

          {/* Right side - Logo (hidden on mobile; shown from sm and up) */}
          <div className="hidden sm:block">
            <StaticLogo />
          </div>
        </div>
      </div>

      {/* Scroll indicator (hidden on mobile to avoid clutter) */}
      <motion.div
        className="hidden sm:block absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 border-2 border-blue-600/70 rounded-full p-1">
          <motion.div
            className="w-1.5 h-1.5 bg-blue-600 rounded-full mx-auto"
            animate={{ y: [0, 20, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </div>
  );
}
