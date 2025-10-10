import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { EnhancedHero } from "@/components/enhanced-hero";
import { DynamicCoursesSection } from "@/components/dynamic-courses-section";
import { DynamicInstructorsSection } from "@/components/dynamic-instructors-section";
import { WhatWeProvideSection } from "@/components/what-we-provide-section";
import { AdminsSection } from "@/components/admins-section";
import { ThreeDBackground } from "@/components/3d-elements";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center relative overflow-hidden bg-white">
      {/* 3D Background */}
      <ThreeDBackground />
      
      <div className="flex-1 w-full flex flex-col items-center relative z-10">
        {/* Header Bar */}
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
              <Link href="/courses" className="text-white hover:text-blue-100 font-semibold transition-colors hidden md:block">
                Courses
              </Link>
              <Link href="/about" className="text-white hover:text-blue-100 font-semibold transition-colors hidden md:block">
                About
              </Link>
              <Link href="/contact" className="text-white hover:text-blue-100 font-semibold transition-colors hidden md:block">
                Contact
              </Link>
              {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="flex-1 w-full">
          <EnhancedHero />
          <WhatWeProvideSection />
          <DynamicCoursesSection />
          <DynamicInstructorsSection />
          <AdminsSection />
        </div>

        {/* Footer section */}
        <footer className="w-full bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {/* Logo and About */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 mb-2">
                  <img src="/assets/roben-logo.png" alt="RobEn Logo" className="h-12 w-12 object-contain" />
                  <span className="text-2xl font-bold text-white leading-tight">RobEn<br />Learning Hub</span>
                </div>
                <p className="text-blue-200 text-sm">
                  Empowering learners worldwide with quality education and cutting-edge technology.
                </p>
              </div>

              {/* Quick Links */}
              <div>
                <h3 className="text-xl font-bold mb-4">Quick Links</h3>
                <div className="flex flex-col gap-2">
                  <Link href="/courses" className="text-blue-200 hover:text-white transition-colors">Courses</Link>
                  <Link href="/about" className="text-blue-200 hover:text-white transition-colors">About Us</Link>
                  <Link href="/contact" className="text-blue-200 hover:text-white transition-colors">Contact</Link>
                  <Link href="/auth/sign-up" className="text-blue-200 hover:text-white transition-colors">Get Started</Link>
                </div>
              </div>

              {/* Social Media */}
              <div>
                <h3 className="text-xl font-bold mb-4">Connect With Us</h3>
                <div className="flex gap-4">
                  <a href="#" aria-label="Facebook" className="w-10 h-10 rounded-full bg-blue-700 hover:bg-blue-600 flex items-center justify-center transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H6v4h4v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
                  </a>
                  <a href="#" aria-label="Instagram" className="w-10 h-10 rounded-full bg-blue-700 hover:bg-blue-600 flex items-center justify-center transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect width="20" height="20" x="2" y="2" rx="5" /><circle cx="12" cy="12" r="5" /><path d="M17 7h.01" /></svg>
                  </a>
                  <a href="#" aria-label="Twitter" className="w-10 h-10 rounded-full bg-blue-700 hover:bg-blue-600 flex items-center justify-center transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" /></svg>
                  </a>
                </div>
              </div>
            </div>

            <div className="border-t border-blue-700 mt-12 pt-8 text-center text-blue-200 text-sm">
              <p>&copy; {new Date().getFullYear()} RobEn Learning Hub. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
