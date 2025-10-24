"use client";

import { LoginForm } from "@/components/login-form";
import { RobenLogo } from "@/components/roben-logo";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

// Force dynamic rendering for this page since it uses search params
export const dynamic = 'force-dynamic';

function AuthContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for SSO errors in URL
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [searchParams]);

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

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Authentication Error</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          )}

          {/* Auth Form Container */}
          <div className="auth-glass rounded-2xl p-8 auth-form-enter">
            <LoginForm />
          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-sm text-gray-500">
            <p>
              Secure authentication powered by Roben.club SSO
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

// Loading fallback for Suspense
function AuthLoading() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-600">Loading authentication...</p>
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <AuthContent />
    </Suspense>
  );
}