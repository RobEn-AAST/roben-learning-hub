import { createBrowserClient } from "@supabase/ssr";

// Custom fetch with timeout and retry logic
const fetchWithTimeout = async (url: string | URL | Request, options: RequestInit = {}) => {
  const timeoutMs = 8000; // 8 second timeout
  const maxRetries = 2;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response;
      
    } catch (error: any) {
      console.warn(`Supabase fetch attempt ${attempt + 1} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw new Error(`Supabase connection failed after ${maxRetries + 1} attempts: ${error.message}`);
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  throw new Error('Unexpected error in fetch retry logic');
};

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!
        },
        fetch: fetchWithTimeout
      }
    }
  );
}
