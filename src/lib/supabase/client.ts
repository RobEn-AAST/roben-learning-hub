import { createBrowserClient } from "@supabase/ssr";

// Custom fetch with timeout and retry logic
// Important: Always create a fresh Request to avoid reusing an aborted signal/body
const fetchWithTimeout = async (url: string | URL | Request, options: RequestInit = {}) => {
  const timeoutMs = 15000; // 15 second timeout to tolerate slower networks
  const maxRetries = 1; // keep retries minimal to avoid long stalls
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let timeoutId: any;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      // Always construct a fresh Request instance to decouple from any caller-supplied Request
      const req = new Request(url as any, {
        ...options,
        // Never forward a pre-existing signal; use our own per-attempt controller
        signal: controller.signal,
      });

      const response = await fetch(req);

      return response;
    } catch (error: any) {
      console.warn(`Supabase fetch attempt ${attempt + 1} failed:`, error?.message || error);
      
      if (attempt === maxRetries) {
        throw new Error(`Supabase connection failed after ${maxRetries + 1} attempts: ${error?.message || error}`);
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    } finally {
      // Ensure any pending timeout is cleared to avoid leaking timers
      if (timeoutId) clearTimeout(timeoutId);
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
