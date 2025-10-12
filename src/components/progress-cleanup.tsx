'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ProgressCleanupProps {
  courseId?: string;
}

export function ProgressCleanupButton({ courseId }: ProgressCleanupProps) {
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const cleanupProgress = async () => {
    setCleaning(true);
    setResult(null);

    try {
      const response = await fetch('/api/progress/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ courseId }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        // Refresh the page after cleanup to show updated progress
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }

    } catch (error) {
      setResult({
        success: false,
        error: (error as Error).message
      });
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 className="font-bold text-yellow-800 mb-2">🔧 Progress Data Issues Detected</h3>
      <p className="text-yellow-700 text-sm mb-4">
        Your progress shows over 100% completion, which indicates duplicate or orphaned records in the database.
      </p>
      
      <Button 
        onClick={cleanupProgress} 
        disabled={cleaning}
        className="mb-4 bg-yellow-600 hover:bg-yellow-700"
      >
        {cleaning ? 'Cleaning Up...' : 'Fix Progress Data'}
      </Button>
      
      {result && (
        <div className="space-y-2">
          {result.success ? (
            <div className="p-3 bg-green-100 text-green-800 rounded">
              <p className="font-semibold">✅ Progress Data Fixed!</p>
              <div className="text-sm mt-2">
                <p>• Duplicates removed: {result.cleanup.duplicatesFound}</p>
                <p>• Orphaned records removed: {result.cleanup.orphanedFound}</p>
                <p>• Total records deleted: {result.cleanup.recordsDeleted}</p>
                <p className="mt-2 font-semibold">
                  New Progress: {result.updatedProgress.completedLessons} of {result.updatedProgress.totalLessons} lessons ({result.updatedProgress.percentage}%)
                </p>
              </div>
              <p className="text-xs mt-2 text-green-600">Page will refresh automatically...</p>
            </div>
          ) : (
            <div className="p-3 bg-red-100 text-red-800 rounded">
              <p className="font-semibold">❌ Cleanup Failed</p>
              <p className="text-sm">{result.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}