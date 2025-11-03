import { createBrowserClient } from "@supabase/ssr";

// Custom fetch with timeout and retry logic
// Important: Always create a fresh Request to avoid reusing an aborted signal/body
const fetchWithTimeout = async (url: string | URL | Request, options: RequestInit = {}) => {
  const urlStr = typeof url === 'string' ? url : (url instanceof Request ? url.url : (url as URL).toString());
  const isQuizRPC = urlStr.includes('/rest/v1/rpc/get_quiz_payload');
  const isQuestions = urlStr.includes('/rest/v1/questions');

  // Tune per-endpoint to avoid duplicate load on low-spec servers
  const timeoutMs = isQuizRPC ? 20000 : 15000; // give RPC more time once; avoid retries
  const maxRetries = (isQuizRPC || isQuestions) ? 0 : 1; // no retries for heavy endpoints
  
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
