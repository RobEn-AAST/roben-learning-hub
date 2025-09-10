import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // No-op for service role client
        },
      },
    }
  );
}

export async function GET() {
  try {
    const adminClient = createAdminClient();

    // Get all auth users
    const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers();
    
    if (authError) {
      console.error('Failed to get auth users:', authError);
      return NextResponse.json({ error: 'Failed to get auth users' }, { status: 500 });
    }

    // Get all profiles
    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('*');

    if (profilesError) {
      console.error('Failed to get profiles:', profilesError);
      return NextResponse.json({ error: 'Failed to get profiles' }, { status: 500 });
    }

    // Combine the data to see the full picture
    const combinedUsers = authUsers.users.map(authUser => {
      const profile = profiles?.find(p => p.id === authUser.id);
      return {
        id: authUser.id,
        email: authUser.email,
        created_at: authUser.created_at,
        updated_at: authUser.updated_at,
        email_confirmed_at: authUser.email_confirmed_at,
        last_sign_in_at: authUser.last_sign_in_at,
        phone: authUser.phone,
        full_name: profile?.full_name || null,
        role: profile?.role || 'user',
        bio: profile?.bio || null,
        avatar_url: profile?.avatar_url || null,
        raw_profile: profile
      };
    });

    return NextResponse.json({
      total_auth_users: authUsers.users.length,
      total_profiles: profiles?.length || 0,
      users: combinedUsers,
      raw_profiles: profiles
    }, { status: 200 });

  } catch (error) {
    console.error('Debug endpoint failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
