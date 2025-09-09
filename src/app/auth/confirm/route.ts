import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Log all parameters for debugging
  console.log('Auth confirm - All URL params:', Object.fromEntries(searchParams.entries()));
  
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/complete-profile";
  
  // Also check for alternative parameter names that Supabase might use
  const token = searchParams.get("token") || token_hash;
  const confirmation_type = searchParams.get("confirmation_type") || type;
  
  console.log('Auth confirm - Extracted params:', { 
    token_hash, 
    type, 
    token, 
    confirmation_type, 
    next,
    url: request.url 
  });

  if ((token_hash || token) && (type || confirmation_type)) {
    const supabase = await createClient();

    console.log('Attempting to verify OTP with params:', {
      type: (type || confirmation_type) as EmailOtpType,
      token_hash: token_hash || token!,
    });

    const { data, error } = await supabase.auth.verifyOtp({
      type: (type || confirmation_type) as EmailOtpType,
      token_hash: token_hash || token!,
    });
    
    console.log('OTP verification result:', { data, error });
    
    if (!error) {
      console.log('Email verification successful');
      
      // Email verification successful
      // Get the user to check if they need to complete their profile
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      console.log('Getting user after verification:', { user: user?.id, userError });
      
      if (user) {
        console.log('User found after verification:', user.id);
        
        // Check if user has completed their profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        console.log('Profile check result:', { profile, profileError });
        
        // If profile doesn't exist or full_name is empty, redirect to complete profile
        if (profileError || !profile || !profile.full_name || profile.full_name.trim() === '') {
          console.log('Redirecting to complete profile');
          redirect('/complete-profile');
        } else {
          console.log('Profile complete, redirecting to:', next);
          // Profile is complete, redirect to home or specified URL
          redirect(next === '/complete-profile' ? '/' : next);
        }
      } else {
        console.log('No user found after verification, redirecting to login');
        // No user found, redirect to login
        redirect('/auth/login');
      }
    } else {
      console.error('Email verification error details:', {
        message: error?.message,
        status: error?.status,
        code: error?.code,
        details: error
      });
      // redirect the user to an error page with some instructions
      redirect(`/auth/error?error=${encodeURIComponent(`Verification failed: ${error?.message || 'Unknown error'}`)}`);
    }
  }

  console.log('Missing required parameters, redirecting to error');
  // redirect the user to an error page with some instructions
  redirect(`/auth/error?error=${encodeURIComponent('Missing confirmation parameters. Please check your email link.')}`);
}
