import { createClient } from '@/lib/supabase/client';
import { createClient as createServerClient } from '@/lib/supabase/server';

export interface UserProfile {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Check if the current user has admin privileges (client-side)
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const supabase = createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return false;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return !profileError && profile?.role === 'admin';
  } catch (error) {
    console.warn('Admin check failed:', error);
    return false;
  }
}

/**
 * Check if a specific user has admin privileges (server-side)
 * Uses service role to bypass RLS for authentication checks
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  // Import here to avoid circular dependencies
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  
  console.log('Checking admin role for user:', userId); // Debug log
  
  // Use service role to bypass RLS for admin checks
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY not found');
    return false;
  }

  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  
  const { data: profile, error } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  console.log('Profile check result:', { profile, error: error?.message }); // Debug log

  const isAdmin = !error && profile?.role === 'admin';
  console.log('Is admin:', isAdmin); // Debug log

  return isAdmin;
}

/**
 * Check if a specific user has instructor privileges (server-side)
 * Uses service role to bypass RLS for authentication checks
 */
export async function isUserInstructor(userId: string): Promise<boolean> {
  // Import here to avoid circular dependencies
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  
  console.log('Checking instructor role for user:', userId); // Debug log
  
  // Use service role to bypass RLS for instructor checks
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY not found');
    return false;
  }

  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  
  const { data: profile, error } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  console.log('Profile check result:', { profile, error: error?.message }); // Debug log

  const isInstructor = !error && (profile?.role === 'instructor' || profile?.role === 'admin');
  console.log('Is instructor or admin:', isInstructor); // Debug log

  return isInstructor;
}

/**
 * Get the current user's profile (client-side)
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = createClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return null;
  }

  return profile as UserProfile;
}

/**
 * Get user profile by ID (server-side)
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = await createServerClient();
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return null;
  }

  return profile as UserProfile;
}

/**
 * Ensure a profile exists for a user, create if missing
 */
export async function ensureUserProfile(userId: string, userData?: { first_name?: string; last_name?: string; full_name?: string; email?: string }): Promise<boolean> {
  const supabase = createClient();
  
  // Check if profile exists
  const { error: checkError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single();
  
  if (checkError && checkError.code === 'PGRST116') {
    // Profile doesn't exist, create it. Prefer explicit first_name/last_name, otherwise split provided full_name.
    let first_name = userData?.first_name || '';
    let last_name = userData?.last_name || '';
    if (!first_name && !last_name) {
      const names = (userData?.full_name || '').trim().split(/\s+/).filter(Boolean);
      first_name = names.length ? names.shift() as string : '';
      last_name = names.length ? names.join(' ') : '';
    }

    const { error: createError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
  first_name: first_name || null,
  last_name: last_name || null,
        email: userData?.email || '',
        role: 'student',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (createError) {
      console.error('Failed to create profile:', createError);
      return false;
    }
    
    console.log('Profile created for user:', userId);
    return true;
  }
  
  return !checkError; // Returns true if profile exists or was created successfully
}

/**
 * Available user roles
 */
export const USER_ROLES = {
  ADMIN: 'admin',
  INSTRUCTOR: 'instructor', 
  STUDENT: 'student'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
