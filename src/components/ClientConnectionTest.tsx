"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ClientConnectionTest() {
  const [status, setStatus] = useState<string>('Testing...');
  const [quizData, setQuizData] = useState<any>(null);

  useEffect(() => {
    async function testConnection() {
      const supabase = createClient();
      
      try {
        // Test basic connection
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);
        
        if (profileError) {
          setStatus(`Profile query error: ${profileError.message}`);
          return;
        }
        
        // Test quiz data
        const { data: quizzes, error: quizError } = await supabase
          .from('quizzes')
          .select('id, title, lesson_id')
          .limit(3);
        
        if (quizError) {
          setStatus(`Quiz query error: ${quizError.message}`);
          return;
        }
        
        const { data: questions, error: questionError } = await supabase
          .from('questions')
          .select('id, content, quiz_id')
          .limit(3);
        
        if (questionError) {
          setStatus(`Question query error: ${questionError.message}`);
          return;
        }
        
        setStatus('✅ Client-side connection successful!');
        setQuizData({
          profiles: profiles?.length || 0,
          quizzes: quizzes?.length || 0,
          questions: questions?.length || 0,
          quizData: quizzes,
          questionData: questions
        });
        
      } catch (error) {
        setStatus(`❌ Client connection failed: ${error}`);
      }
    }
    
    testConnection();
  }, []);

  return (
    <div className="p-4 border rounded-lg bg-white">
      <h3 className="text-lg font-semibold mb-2 text-gray-900">Client-Side Connection Test</h3>
      <p className="mb-2 text-gray-800">{status}</p>
      {quizData && (
        <div className="text-sm text-gray-700">
          <p className="text-gray-800">Profiles found: {quizData.profiles}</p>
          <p className="text-gray-800">Quizzes found: {quizData.quizzes}</p>
          <p className="text-gray-800">Questions found: {quizData.questions}</p>
          {quizData.quizzes > 0 && (
            <details className="mt-2">
              <summary className="text-gray-900 font-medium cursor-pointer">Quiz Data</summary>
              <pre className="text-xs bg-gray-100 text-gray-900 p-2 mt-1 rounded border">
                {JSON.stringify(quizData.quizData, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}