import React from "react";
import { CoursesAdminDashboard } from "@/components/admin/CoursesAdminDashboard";
import Link from "next/link";
import { AuthButton } from "@/components/auth-button";
import { hasEnvVars } from "@/lib/utils";
import { EnvVarWarning } from "@/components/env-var-warning";

export default function AllCoursesPage() {
  return (
    <main className="min-h-screen flex flex-col items-center relative overflow-hidden">
      {/* No background image, just white background */}
  <div className="flex-1 w-full flex flex-col items-center relative z-10 text-black bg-white">
        {/* Header Bar */}
        <nav className="w-full flex justify-center h-16 shadow-md bg-gradient-to-r from-blue-800 via-blue-500 to-purple-600">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex items-center h-10">
              <Link href="/" className="flex items-center gap-2 group h-full">
                <span className="flex items-center gap-2 font-bold text-lg text-white bg-transparent border-none shadow-none cursor-pointer select-none focus:outline-none h-full">
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
        <div className="w-full max-w-6xl p-6 mt-8">
          <h1 className="text-3xl font-bold text-black mb-6">All Courses</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <Link href="/courses/intro-to-programming">
                <button className="w-full bg-gradient-to-r from-blue-800 via-blue-500 to-purple-600 hover:from-blue-900 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-lg shadow transition text-lg mb-2">Introduction to Programming</button>
              </Link>
              <div className="bg-white/60 text-black rounded p-3 mb-4 text-sm">
                Learn the basics of programming with hands-on modules in Python, C++, JavaScript, and Java. Perfect for beginners!
              </div>
            </div>
            <div>
              <Link href="/courses/web-dev-bootcamp">
                <button className="w-full bg-gradient-to-r from-blue-800 via-blue-500 to-purple-600 hover:from-blue-900 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-lg shadow transition text-lg mb-2">Web Development Bootcamp</button>
              </Link>
              <div className="bg-white/10 text-black rounded p-3 mb-4 text-sm">
                Build modern websites from scratch: HTML, CSS, JavaScript, and React. No prior experience required.
              </div>
            </div>
            <div>
              <Link href="/courses/data-science-essentials">
                <button className="w-full bg-gradient-to-r from-blue-800 via-blue-500 to-purple-600 hover:from-blue-900 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-lg shadow transition text-lg mb-2">Data Science Essentials</button>
              </Link>
              <div className="bg-white/10 text-black rounded p-3 mb-4 text-sm">
                Dive into data analysis, visualization, and Python tools like Pandas and Numpy. Start your data journey here.
              </div>
            </div>
            <div>
              <Link href="/courses/ai-for-beginners">
                <button className="w-full bg-gradient-to-r from-blue-800 via-blue-500 to-purple-600 hover:from-blue-900 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-lg shadow transition text-lg mb-2">AI for Beginners</button>
              </Link>
              <div className="bg-white/10 text-black rounded p-3 mb-4 text-sm">
                Understand the fundamentals of Artificial Intelligence and Machine Learning with beginner-friendly projects.
              </div>
            </div>
            <div>
              <Link href="/courses/advanced-python">
                <button className="w-full bg-gradient-to-r from-blue-800 via-blue-500 to-purple-600 hover:from-blue-900 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-lg shadow transition text-lg mb-2">Advanced Python</button>
              </Link>
              <div className="bg-white/10 text-black rounded p-3 mb-4 text-sm">
                Master advanced Python concepts: OOP, async programming, and real-world applications.
              </div>
            </div>
            <div>
              <Link href="/courses/ui-ux-design">
                <button className="w-full bg-gradient-to-r from-blue-800 via-blue-500 to-purple-600 hover:from-blue-900 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-lg shadow transition text-lg mb-2">UI/UX Design</button>
              </Link>
              <div className="bg-white/10 text-black rounded p-3 mb-4 text-sm">
                Explore the world of user interface and experience design. Learn Figma, design systems, and more.
              </div>
            </div>
            {/* New Courses */}
            <div>
              <Link href="/courses/mobile-app-development">
                <button className="w-full bg-gradient-to-r from-blue-800 via-blue-500 to-purple-600 hover:from-blue-900 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-lg shadow transition text-lg mb-2">Mobile App Development</button>
              </Link>
              <div className="bg-white/10 text-black rounded p-3 mb-4 text-sm">
                Create mobile apps for Android and iOS using React Native and Flutter. Learn to deploy and publish your own apps.
              </div>
            </div>
            <div>
              <Link href="/courses/cybersecurity-basics">
                <button className="w-full bg-gradient-to-r from-blue-800 via-blue-500 to-purple-600 hover:from-blue-900 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-lg shadow transition text-lg mb-2">Cybersecurity Basics</button>
              </Link>
              <div className="bg-white/10 text-black rounded p-3 mb-4 text-sm">
                Understand the essentials of cybersecurity, ethical hacking, and how to protect yourself and organizations online.
              </div>
            </div>
            <div>
              <Link href="/courses/cloud-computing">
                <button className="w-full bg-gradient-to-r from-blue-800 via-blue-500 to-purple-600 hover:from-blue-900 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-lg shadow transition text-lg mb-2">Cloud Computing</button>
              </Link>
              <div className="bg-white/10 text-black rounded p-3 mb-4 text-sm">
                Learn about AWS, Azure, and Google Cloud. Deploy scalable applications and understand cloud architecture.
              </div>
            </div>
            <div>
              <Link href="/courses/blockchain-fundamentals">
                <button className="w-full bg-gradient-to-r from-blue-800 via-blue-500 to-purple-600 hover:from-blue-900 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-lg shadow transition text-lg mb-2">Blockchain Fundamentals</button>
              </Link>
              <div className="bg-white/10 text-black rounded p-3 mb-4 text-sm">
                Discover how blockchain works, smart contracts, and the basics of cryptocurrencies and decentralized apps.
              </div>
            </div>
            <div>
              <Link href="/courses/game-development">
                <button className="w-full bg-gradient-to-r from-blue-800 via-blue-500 to-purple-600 hover:from-blue-900 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-lg shadow transition text-lg mb-2">Game Development</button>
              </Link>
              <div className="bg-white/10 text-black rounded p-3 mb-4 text-sm">
                Design and build games using Unity and Unreal Engine. Learn game mechanics, graphics, and publishing.
              </div>
            </div>
            <div>
              <Link href="/courses/digital-marketing">
                <button className="w-full bg-gradient-to-r from-blue-800 via-blue-500 to-purple-600 hover:from-blue-900 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-lg shadow transition text-lg mb-2">Digital Marketing</button>
              </Link>
              <div className="bg-white/10 text-black rounded p-3 mb-4 text-sm">
                Master SEO, social media, and online advertising. Grow your brand and reach new audiences effectively.
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
