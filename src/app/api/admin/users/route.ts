import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

// Create admin client with service role key
const createAdminClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
  }

  return createClient(
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

async function checkAdminPermission(request: NextRequest) {
  try {
    // Debug: Log the cookies being received
    const cookies = request.cookies.getAll();
    console.log('Received cookies count:', cookies.length);
    
    const supabase = await createServerClient();
    
    // Get current user - try both getUser and getSession for debugging
    const [userResult, sessionResult] = await Promise.all([
      supabase.auth.getUser(),
      supabase.auth.getSession()
    ]);
    
    const { data: { user }, error: userError } = userResult;
    const { data: { session }, error: sessionError } = sessionResult;
    
    console.log('Auth debug:', {
      hasUser: !!user,
      hasSession: !!session,
      userError: userError?.message,
      sessionError: sessionError?.message,
      userId: user?.id,
      userEmail: user?.email
    });
    
    if (userError || !user) {
      console.error('Auth error or no user:', { userError, hasUser: !!user, hasSession: !!session });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Current user ID:', user.id, 'Email:', user.email);

    // Use admin client to bypass RLS for role checking
    // This is necessary because RLS policies might prevent reading profile roles
    const supabaseAdmin = createAdminClient();
    
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('Profile check result (using admin client):', { 
      profile, 
      error: profileError, 
      userId: user.id,
      hasProfile: !!profile,
      role: profile?.role 
    });

    if (profileError || profile?.role !== 'admin') {
      console.error('Not admin or profile error:', { 
        profileError: profileError?.message, 
        role: profile?.role,
        userId: user.id 
      });
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
  } catch (error) {
    console.error('Exception in checkAdminPermission:', error);
    return NextResponse.json({ error: 'Authentication check failed' }, { status: 500 });
  }

  return null; // No error, user is admin
}

// GET - List all users
export async function GET(request: NextRequest) {
  try {
    // Check admin permissions
    const permissionError = await checkAdminPermission(request);
    if (permissionError) return permissionError;

    // Create admin client
    const supabaseAdmin = createAdminClient();

    // Get auth users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Get profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
    }

    // Merge auth users with profiles
    const users = authUsers.users.map(authUser => {
      const profile = profiles.find(p => p.id === authUser.id);
      const combinedUser = {
        id: authUser.id,
        email: authUser.email,
        email_confirmed_at: authUser.email_confirmed_at,
        created_at: authUser.created_at,
        updated_at: authUser.updated_at,
        last_sign_in_at: authUser.last_sign_in_at,
        phone: authUser.phone,
        // Profile data
        full_name: profile?.full_name || null,
        avatar_url: profile?.avatar_url || null,
        role: profile?.role || 'student',
        bio: profile?.bio || null
      };
      
      // Debug logging
      console.log('API Debug - User:', authUser.email, 'Profile role:', profile?.role, 'Combined role:', combinedUser.role);
      
      return combinedUser;
    });

    return NextResponse.json({ users, count: users.length });
  } catch (error) {
    console.error('Error in GET /api/admin/users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    // Check admin permissions
    const permissionError = await checkAdminPermission(request);
    if (permissionError) return permissionError;

    // Create admin client
    const supabaseAdmin = createAdminClient();

    const body = await request.json();
    const { email, password, phone, full_name, role, bio, avatar_url } = body;

    // Create user in auth.users
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      phone: phone || undefined,
      email_confirm: true
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Update profile (should be created by trigger)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: full_name || null,
        role: role || 'student',
        bio: bio || null,
        avatar_url: avatar_url || null
      })
      .eq('id', authUser.user.id)
      .select()
      .single();

    if (profileError) {
      console.error('Error updating profile:', profileError);
      // Don't return error here, user was created successfully
    }

    return NextResponse.json({
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
        email_confirmed_at: authUser.user.email_confirmed_at,
        created_at: authUser.user.created_at,
        updated_at: authUser.user.updated_at,
        last_sign_in_at: authUser.user.last_sign_in_at,
        phone: authUser.user.phone,
        full_name: profile?.full_name || full_name || null,
        avatar_url: profile?.avatar_url || avatar_url || null,
        role: profile?.role || role || 'student',
        bio: profile?.bio || bio || null
      }
    });
  } catch (error) {
    console.error('Error in POST /api/admin/users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
