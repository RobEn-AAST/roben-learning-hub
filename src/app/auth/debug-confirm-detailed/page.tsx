'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Export dynamic rendering configuration
export const dynamic = 'force-dynamic';

interface DebugResult {
  step: string;
  success: boolean;
  data?: any;
  error?: string;
}

function DebugConfirmInner() {
  const [results, setResults] = useState<DebugResult[]>([]);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();

  const runDebugFlow = async () => {
    setLoading(true);
    const debugResults: DebugResult[] = [];

    // Step 1: Check URL parameters
    const token_hash = searchParams.get("token_hash");
    const type = searchParams.get("type");
    const token = searchParams.get("token");
    const confirmation_type = searchParams.get("confirmation_type");

    debugResults.push({
      step: "1. URL Parameters",
      success: !!(token_hash || token) && !!(type || confirmation_type),
      data: { token_hash, type, token, confirmation_type }
    });

    if ((token_hash || token) && (type || confirmation_type)) {
      try {
        // Step 2: Attempt OTP verification
        const supabase = createClient();
        const { data, error } = await supabase.auth.verifyOtp({
          type: (type || confirmation_type) as any,
          token_hash: token_hash || token!,
        });

        debugResults.push({
          step: "2. OTP Verification",
          success: !error,
          data: data ? { user: data.user?.id, session: !!data.session } : null,
          error: error?.message
        });

        if (!error && data.user) {
          // Step 3: Check user session
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          debugResults.push({
            step: "3. User Session Check",
            success: !!user && !userError,
            data: user ? { id: user.id, email: user.email } : null,
            error: userError?.message
          });

          if (user) {
            // Step 4: Check profile
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();

            debugResults.push({
              step: "4. Profile Check",
              success: !!profile && !profileError,
              data: profile,
              error: profileError?.message
            });
          }
        }
      } catch (err) {
        debugResults.push({
          step: "2. OTP Verification (Exception)",
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    setResults(debugResults);
    setLoading(false);
  };

  useEffect(() => {
    runDebugFlow();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <Card className="w-full max-w-4xl bg-white">
        <CardHeader>
          <CardTitle className="text-gray-900">Email Confirmation Debug Tool</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Current URL */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Current URL:</h3>
              <div className="bg-gray-100 p-3 rounded font-mono text-sm break-all text-gray-800">
                {typeof window !== 'undefined' ? window.location.href : 'Loading...'}
              </div>
            </div>

            {/* Debug Results */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Debug Results:</h3>
                <Button onClick={runDebugFlow} disabled={loading} size="sm">
                  {loading ? 'Testing...' : 'Re-run Test'}
                </Button>
              </div>

              <div className="space-y-3">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      result.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3 ${
                          result.success ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      >
                        {result.success ? '✓' : '✗'}
                      </div>
                      <h4 className="font-semibold text-gray-900">{result.step}</h4>
                    </div>

                    {result.data && (
                      <div className="ml-9">
                        <p className="text-sm text-gray-700 mb-2">Data:</p>
                        <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto text-gray-800">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </div>
                    )}

                    {result.error && (
                      <div className="ml-9">
                        <p className="text-sm text-red-700">
                          <strong>Error:</strong> {result.error}
                        </p>
                      </div>
                    )}
                  </div>
                ))}

                {results.length === 0 && loading && (
                  <div className="text-center py-8 text-gray-600">
                    Running debug tests...
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button asChild>
                <Link href="/auth/sign-up">Try Sign Up Again</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/auth/login">Go to Login</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/">Home</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DebugConfirmPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <DebugConfirmInner />
    </Suspense>
  );
}
