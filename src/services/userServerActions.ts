import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Create admin client with service role key
const createAdminClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

export interface CombinedUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: string | null;
  created_at: string;
  updated_at: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  is_anonymous: boolean;
  phone: string | null;
}

/**
 * Server action to get all users - avoids API route issues
 */
export async function getAllUsersServerAction(): Promise<CombinedUser[]> {
  // Check if current user is admin
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('Unauthorized');
  }

  // Create admin client for both role checking and data fetching (bypasses RLS)
  const supabaseAdmin = createAdminClient();
  
  // Check admin role using admin client to bypass RLS
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    throw new Error('Admin access required');
  }

  // Get auth users
  const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (authError) {
    console.error('Error fetching auth users:', authError);
    throw new Error('Failed to fetch users');
  }

  // Get profiles
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('*');

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
    throw new Error('Failed to fetch profiles');
  }

  // Merge auth users with profiles
  const users: CombinedUser[] = authUsers.users.map(authUser => {
    const userProfile = profiles.find(p => p.id === authUser.id);
    return {
      id: authUser.id,
      email: authUser.email || '',
      email_confirmed_at: authUser.email_confirmed_at || null,
      created_at: authUser.created_at,
      updated_at: authUser.updated_at || authUser.created_at,
      last_sign_in_at: authUser.last_sign_in_at || null,
      full_name: userProfile?.full_name || null,
      avatar_url: userProfile?.avatar_url || null,
      bio: userProfile?.bio || null,
      role: userProfile?.role || null,
      is_anonymous: false,
      phone: null,
    };
  });

  return users;
}

export interface UserStats {
  totalUsers: number;
  adminUsers: number;
  regularUsers: number;
  emailConfirmed: number;
  unconfirmedUsers: number;
  recentlyActive: number;
}

/**
 * Server action to get user statistics
 */
export async function getUserStatsServerAction(): Promise<UserStats> {
  // Check if current user is admin
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('Unauthorized');
  }

  // Check admin role using admin client to bypass RLS
  const supabaseAdmin = createAdminClient();
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    throw new Error('Admin access required');
  }

  // Get all users first
  const users = await getAllUsersServerAction();
  
  // Calculate stats to match existing interface
  const totalUsers = users.length;
  const adminUsers = users.filter(u => u.role === 'admin').length;
  const regularUsers = users.filter(u => u.role === 'user').length;
  const emailConfirmed = users.filter(u => u.email_confirmed_at !== null).length;
  const unconfirmedUsers = users.filter(u => u.email_confirmed_at === null).length;
  
  // Recently active (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentlyActive = users.filter(u => {
    if (!u.last_sign_in_at) return false;
    return new Date(u.last_sign_in_at) > sevenDaysAgo;
  }).length;

  return {
    totalUsers,
    adminUsers,
    regularUsers,
    emailConfirmed,
    unconfirmedUsers,
    recentlyActive
  };
}