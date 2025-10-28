import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, checkAdminPermission } from '@/lib/adminHelpers';



// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('PUT /api/admin/users/[id] - Starting request');

    const adminCheck = await checkAdminPermission();
    if (adminCheck) {
      console.error('Admin check failed');
      return adminCheck; // Return the NextResponse directly
    }

    const { id } = await params;
    const updateData = await request.json();
    const adminClient = createAdminClient();

    // Update auth user if email changed (do not write phone to auth; keep phone in profiles.phone_number)
    if (updateData.email) {
      const authUpdateData: any = {};
      authUpdateData.email = updateData.email;
      
      const { error: authError } = await adminClient.auth.admin.updateUserById(id, authUpdateData);
      if (authError) {
        console.error('Failed to update auth user:', authError);
        return NextResponse.json(
          { error: 'Failed to update user authentication' },
          { status: 500 }
        );
      }
    }

    // Update profile data (no full_name column; split into first_name/last_name)
    const profileUpdates: any = {};
    if (updateData.full_name !== undefined) {
      const names = (updateData.full_name || '').trim().split(/\s+/).filter(Boolean);
      profileUpdates.first_name = names.length ? names.shift() as string : null;
      profileUpdates.last_name = names.length ? names.join(' ') : null;
    }
    if (updateData.first_name !== undefined) profileUpdates.first_name = updateData.first_name;
    if (updateData.last_name !== undefined) profileUpdates.last_name = updateData.last_name;
  if (updateData.phone !== undefined) profileUpdates.phone_number = updateData.phone;
    if (updateData.role !== undefined) profileUpdates.role = updateData.role;
    if (updateData.bio !== undefined) profileUpdates.bio = updateData.bio;
    if (updateData.avatar_url !== undefined) profileUpdates.avatar_url = updateData.avatar_url;

    if (Object.keys(profileUpdates).length > 0) {
      profileUpdates.updated_at = new Date().toISOString();
      
      const { error: profileError } = await adminClient
        .from('profiles')
        .upsert({ id, ...profileUpdates });

      if (profileError) {
        console.error('Failed to update profile:', profileError);
        return NextResponse.json(
          { error: 'Failed to update user profile' },
          { status: 500 }
        );
      }
    }

    // Fetch and return the updated user data
    const { data: authUser, error: fetchAuthError } = await adminClient.auth.admin.getUserById(id);
    if (fetchAuthError) {
      console.error('Failed to fetch updated auth user:', fetchAuthError);
      return NextResponse.json(
        { error: 'Failed to fetch updated user data' },
        { status: 500 }
      );
    }

    const { data: profile, error: fetchProfileError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchProfileError) {
      console.error('Failed to fetch updated profile:', fetchProfileError);
      return NextResponse.json(
        { error: 'Failed to fetch updated profile data' },
        { status: 500 }
      );
    }

    // Return the updated user data in the expected format
    const computedFullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || null;
    const updatedUser = {
      id: authUser.user.id,
      email: authUser.user.email || '',
      phone: profile.phone_number || null,
      full_name: computedFullName,
      avatar_url: profile.avatar_url || null,
      bio: profile.bio || null,
      role: profile.role || 'student',
      email_confirmed_at: authUser.user.email_confirmed_at || null,
      last_sign_in_at: authUser.user.last_sign_in_at || null,
      created_at: authUser.user.created_at,
      updated_at: profile.updated_at || authUser.user.created_at
    };

    console.log('Successfully updated user:', id);
    return NextResponse.json({ user: updatedUser });

  } catch (error) {
    console.error('PUT /api/admin/users/[id] failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('DELETE /api/admin/users/[id] - Starting request');

    const adminCheck = await checkAdminPermission();
    if (adminCheck) {
      console.error('Admin check failed');
      return adminCheck; // Return the NextResponse directly
    }

    const { id } = await params;
    const adminClient = createAdminClient();

    // First delete from profiles table explicitly
    const { error: profileError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', id);

    if (profileError) {
      console.error('Failed to delete profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to delete user profile' },
        { status: 500 }
      );
    }

    // Then delete from auth.users
    const { error: authError } = await adminClient.auth.admin.deleteUser(id);
    if (authError) {
      console.error('Failed to delete auth user:', authError);
      return NextResponse.json(
        { error: 'Failed to delete user from authentication system' },
        { status: 500 }
      );
    }

    console.log('Successfully deleted user:', id);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('DELETE /api/admin/users/[id] failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Reset password
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('POST /api/admin/users/[id]/reset-password - Starting request');

    const adminCheck = await checkAdminPermission();
    if (adminCheck) {
      console.error('Admin check failed');
      return adminCheck; // Return the NextResponse directly
    }

    const { id } = await params;
    const { password } = await request.json();
    
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Update user password
    const { error: authError } = await adminClient.auth.admin.updateUserById(id, {
      password: password
    });

    if (authError) {
      console.error('Failed to reset password:', authError);
      return NextResponse.json(
        { error: 'Failed to reset user password' },
        { status: 500 }
      );
    }

    console.log('Successfully reset password for user:', id);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('POST /api/admin/users/[id]/reset-password failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
