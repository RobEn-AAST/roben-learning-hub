import { createClient } from '@/lib/supabase/client';
import { createClient as createServerClient } from '@/lib/supabase/server';

export interface UserProfile {
  id: string;
  full_name: string | null;
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
}

/**
 * Check if a specific user has admin privileges (server-side)
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const supabase = await createServerClient();
  
  console.log('Checking admin role for user:', userId); // Debug log
  
  const { data: profile, error } = await supabase
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
export async function ensureUserProfile(userId: string, userData?: { full_name?: string; email?: string }): Promise<boolean> {
  const supabase = createClient();
  
  // Check if profile exists
  const { data: existingProfile, error: checkError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single();
  
  if (checkError && checkError.code === 'PGRST116') {
    // Profile doesn't exist, create it
    const { error: createError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        full_name: userData?.full_name || '',
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
