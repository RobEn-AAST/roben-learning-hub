'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useLandingPageDataLazy } from '@/hooks/useQueryCache';

interface Admin {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
}

export function AdminsSection() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            obs.disconnect();
          }
        });
      },
      { rootMargin: '0px 0px -100px 0px', threshold: 0.1 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const { data, isLoading } = useLandingPageDataLazy(visible);
  const admins = (data?.admins || []) as Admin[];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!visible || isLoading || admins.length === 0) return (
    <section ref={ref} className="w-full py-20 bg-gradient-to-b from-white to-blue-50" />
  );

  return (
  <section ref={ref} className="w-full py-20 bg-gradient-to-b from-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Our <span className="text-blue-600">Leadership Team</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Meet the administrators who keep everything running smoothly
          </p>
        </motion.div>

        <div className="flex justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl"
          >
            {admins.map((admin, index) => (
              <motion.div
                key={admin.id}
                initial={{ opacity: 0, y: 5 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className="group"
              >
                <div className="bg-white rounded-xl shadow-lg p-8 text-center transition-all duration-300 border-2 border-blue-200">
                  {/* Badge */}
                  <div className="inline-block bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
                    ADMIN
                  </div>

                  {/* Avatar */}
                  <div className="relative mb-6">
                    {admin.avatar_url ? (
                      <div className="relative w-24 h-24 mx-auto">
                        <Image
                          src={admin.avatar_url}
                          alt={admin.first_name + ' ' + admin.last_name}
                          fill
                          className="rounded-full object-cover border-4 border-blue-300 transition-colors"
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center border-4 border-blue-300 transition-all">
                        <span className="text-3xl font-bold text-white">
                          {getInitials((admin.first_name || '') + ' ' + (admin.last_name || ''))}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <h3 className="text-xl font-bold text-gray-900 mb-2 transition-colors">
                    {(admin.first_name || '') + ' ' + (admin.last_name || '')}
                  </h3>
                  
                  {admin.bio ? (
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {admin.bio}
                    </p>
                  ) : (
                    <p className="text-gray-600 text-sm">
                      Platform Administrator
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
