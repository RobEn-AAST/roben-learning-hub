'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export function InteractiveHeaderLogo() {
  return (
    <Link 
      href="/" 
      className="flex items-center gap-3 group h-full transition-transform hover:scale-105"
    >
      <span className="flex items-center gap-3 font-bold text-lg bg-transparent border-none shadow-none cursor-pointer select-none focus:outline-none h-full">
        <motion.span 
          className="flex items-center h-12 w-12 rounded-full bg-white p-2 shadow-lg group-hover:shadow-xl transition-shadow"
          whileHover={{
            scale: 1.1,
          }}
        >
          <img 
            src="/assets/favicon.png" 
            alt="favicon" 
            className="h-full w-full object-contain"
          />
        </motion.span>
        <span className="flex flex-col leading-tight">
          <span className="font-extrabold text-2xl text-white tracking-wide">RobEn</span>
          <span className="font-semibold text-sm text-blue-100 tracking-wide">Learning Hub</span>
        </span>
      </span>
    </Link>
  );
}