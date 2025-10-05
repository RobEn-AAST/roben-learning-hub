import { DeployButton } from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { Hero } from "@/components/hero";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { ConnectSupabaseSteps } from "@/components/tutorial/connect-supabase-steps";
import { SignUpUserSteps } from "@/components/tutorial/sign-up-user-steps";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
// import { RobenLogo } from "@/components/roben-logo";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center relative overflow-hidden">
      {/* No background image, just white background */}
  <div className="flex-1 w-full flex flex-col gap-20 items-center relative z-10 text-black">
        {/* Header Bar */}
        <nav className="w-full flex justify-center h-16 shadow-md bg-gradient-to-r from-blue-800 via-blue-500 to-purple-600">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex items-center h-10">
              <Link href="/" className="flex items-center gap-2 group h-full">
                <span className="flex items-center gap-2 font-bold text-lg bg-transparent border-none shadow-none cursor-pointer select-none focus:outline-none h-full">
                  <span className="flex items-center h-8 w-8">
                    <img src="/assets/favicon.png" alt="favicon" className="h-8 w-8 object-contain" />
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="font-extrabold text-2xl text-white tracking-wide">RobEn</span>
                    <span className="font-semibold text-base text-white tracking-wide">Learning Hub</span>
                  </span>
                </span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
            </div>
          </div>
        </nav>
        {/* Main Content */}

    <div className="flex-1 flex flex-col gap-20 max-w-5xl p-5 bg-white text-black">
          <Hero />
          {/* Info Section */}
          <section className="w-full flex flex-col gap-8 mt-40">
            <h2 className="text-2xl font-bold text-black mb-4">About RobEn Learning Hub</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white/60 rounded-lg p-6 shadow-lg border border-blue-200/30">
                <h3 className="text-xl font-semibold text-yellow-600 mb-2">What is RobEn Learning Hub?</h3>
                <p className="text-black text-base">RobEn Learning Hub is a modern platform designed to empower learners and educators. It provides a seamless experience for managing courses, tracking progress, and engaging with interactive content.</p>
              </div>
              <div className="bg-white/60 rounded-lg p-6 shadow-lg border border-blue-200/30">
                <h3 className="text-xl font-semibold text-yellow-600 mb-2">Our Mission</h3>
                <p className="text-black text-base">Our mission is to make high-quality education accessible to everyone, everywhere. We believe in the power of technology to transform learning and help you control your future.</p>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-black mt-8 mb-4">Popular Courses</h2>
            <div className="flex items-center justify-between mb-2">
              <span></span>
              <a href="/courses">
                <button className="bg-gradient-to-r from-blue-800 via-blue-500 to-purple-600 hover:from-blue-900 hover:to-purple-700 text-white font-semibold py-2 px-4 rounded shadow transition">View All</button>
              </a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white/10 rounded-lg p-6 shadow-lg border border-blue-200/30">
                <h4 className="text-lg font-semibold text-blue-200 mb-2">Introduction to Programming</h4>
                <p className="text-black text-base">Learn the basics of coding with hands-on projects and real-world examples. Perfect for beginners!</p>
              </div>
              <div className="bg-white/10 rounded-lg p-6 shadow-lg border border-blue-200/30">
                <h4 className="text-lg font-semibold text-blue-200 mb-2">Web Development Bootcamp</h4>
                <p className="text-black text-base">Build modern websites and applications using HTML, CSS, JavaScript, and React. No prior experience required.</p>
              </div>
              <div className="bg-white/10 rounded-lg p-6 shadow-lg border border-blue-200/30">
                <h4 className="text-lg font-semibold text-blue-200 mb-2">Data Science Essentials</h4>
                <p className="text-black text-base">Explore the world of data analysis, visualization, and machine learning with practical exercises and projects.</p>
              </div>
            </div>
          </section>
          {/* Top Instructors Section */}
          <section className="w-full flex flex-col gap-8 mt-12">
            <h2 className="text-2xl font-bold text-black mb-4">Our Top Instructors</h2>
            <div className="flex items-center justify-between mb-2">
              <span></span>
              <a href="/instructors">
                <button className="bg-gradient-to-r from-blue-800 via-blue-500 to-purple-600 hover:from-blue-900 hover:to-purple-700 text-white font-semibold py-2 px-4 rounded shadow transition">View All</button>
              </a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white/10 rounded-lg p-6 shadow-lg border border-blue-200/30 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-blue-300 mb-3 flex items-center justify-center text-2xl font-bold text-blue-900">A</div>
                <h4 className="text-lg font-semibold text-yellow-600 mb-1">Alex Johnson</h4>
                <p className="text-black text-base text-center">Expert in Web Development and JavaScript. Passionate about teaching and building real-world projects.</p>
              </div>
              <div className="bg-white/10 rounded-lg p-6 shadow-lg border border-blue-200/30 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-blue-300 mb-3 flex items-center justify-center text-2xl font-bold text-blue-900">S</div>
                <h4 className="text-lg font-semibold text-yellow-600 mb-1">Sara Lee</h4>
                <p className="text-black text-base text-center">Data Scientist with 10+ years of experience. Loves making complex topics simple and fun.</p>
              </div>
              <div className="bg-white/10 rounded-lg p-6 shadow-lg border border-blue-200/30 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-blue-300 mb-3 flex items-center justify-center text-2xl font-bold text-blue-900">M</div>
                <h4 className="text-lg font-semibold text-yellow-600 mb-1">Mohamed Ali</h4>
                <p className="text-black text-base text-center">Specialist in Python and AI. Focused on hands-on learning and student engagement.</p>
              </div>
            </div>
          </section>
        </div>

  {/* Footer section */}
      <footer className="w-full mt-24 bg-transparent">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div className="flex flex-col gap-2 items-start">
            <div className="flex items-center gap-2 mb-2">
              <img src="/assets/roben-logo.png" alt="RobEn Logo" className="h-10 w-10 object-contain" />
              <span className="text-xl font-bold text-black leading-tight">ROBEN<br />CLUB</span>
            </div>
            <div className="flex gap-4 text-gray-300 text-sm">
              <a href="#" className="hover:underline">About</a>
              <a href="#" className="hover:underline">Contact us</a>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 w-full md:w-auto">
            <div className="flex gap-4 mb-2">
              <a href="#" aria-label="Facebook"><svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H6v4h4v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg></a>
              <a href="#" aria-label="Instagram"><svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect width="20" height="20" x="2" y="2" rx="5" /><circle cx="12" cy="12" r="5" /><path d="M17 7h.01" /></svg></a>
            </div>
          </div>
        </div>
      </footer>
      </div>
    </main>
  );
}
