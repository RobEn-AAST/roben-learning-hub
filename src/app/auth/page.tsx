"use client";

import { EnhancedAuthForm } from "@/components/enhanced-auth-form";
import { RobenLogo } from "@/components/roben-logo";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthPage() {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check URL to determine initial mode
    const mode = searchParams.get('mode');
    if (mode === 'signup') {
      setAuthMode('signup');
    }
  }, [searchParams]);

  const handleModeChange = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    // Update URL without causing a full page reload
    const url = new URL(window.location.href);
    url.searchParams.set('mode', mode);
    window.history.replaceState({}, '', url.toString());
  };

  return (
    <main className="min-h-screen flex flex-col items-center relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-40">
        <div className="w-full h-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>
      
      {/* Geometric shapes */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full opacity-20 blur-xl"></div>
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-20 blur-xl"></div>
      <div className="absolute top-1/3 right-20 w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full opacity-20 blur-xl"></div>
      
      {/* Main Content */}
      <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-10 relative z-10">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4">
              <RobenLogo />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              RobEn Learning Hub
            </h1>
            <p className="text-gray-600">
              Your gateway to professional development and learning
            </p>
          </div>

          {/* Auth Form Container */}
          <div className="auth-glass rounded-2xl p-8 auth-form-enter">
            <EnhancedAuthForm 
              mode={authMode} 
              onModeChange={handleModeChange}
            />
          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-sm text-gray-500">
            <p>
              Secure authentication powered by Supabase
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}