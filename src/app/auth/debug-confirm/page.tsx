'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DebugConfirmPage() {
  const [urlParams, setUrlParams] = useState<Record<string, string>>({});
  const searchParams = useSearchParams();

  useEffect(() => {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    setUrlParams(params);
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <Card className="w-full max-w-2xl bg-white">
        <CardHeader>
          <CardTitle className="text-gray-900">Debug: Email Confirmation Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">URL Parameters:</h3>
              {Object.keys(urlParams).length === 0 ? (
                <p className="text-gray-600">No parameters found in URL</p>
              ) : (
                <div className="bg-gray-100 p-3 rounded font-mono text-sm">
                  {Object.entries(urlParams).map(([key, value]) => (
                    <div key={key} className="text-gray-800">
                      <span className="font-semibold">{key}:</span> {value}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Expected Parameters:</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li><code className="bg-gray-200 px-1 rounded">token_hash</code> - The email verification token</li>
                <li><code className="bg-gray-200 px-1 rounded">type</code> - Should be "signup" or "email"</li>
                <li><code className="bg-gray-200 px-1 rounded">next</code> - Optional redirect URL</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Full URL:</h3>
              <div className="bg-gray-100 p-3 rounded font-mono text-sm break-all text-gray-800">
                {typeof window !== 'undefined' ? window.location.href : 'Loading...'}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Troubleshooting:</h3>
              <div className="text-sm text-gray-600 space-y-2">
                <p>If you&apos;re seeing this page instead of being confirmed automatically:</p>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>Check that your Supabase project has the correct Site URL configured</li>
                  <li>Make sure the redirect URL is added to your allowed redirect URLs</li>
                  <li>Verify that the email template includes the correct confirmation link format</li>
                </ol>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
