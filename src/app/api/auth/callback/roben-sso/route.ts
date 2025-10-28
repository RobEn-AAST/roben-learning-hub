import { NextRequest, NextResponse } from 'next/server';
import { RobenSSO } from '@/lib/roben-sso';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { normalizeEgyptianPhone } from '@/lib/phone';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    // Handle error from Roben.club
    if (error) {
      console.error('SSO Error:', error);
      return NextResponse.redirect(new URL(`/auth?error=${encodeURIComponent(error)}`, request.url));
    }

    // Validate authorization code
    if (!code) {
      return NextResponse.redirect(new URL('/auth?error=missing_code', request.url));
    }

    const sso = new RobenSSO();

    // Step 2: Exchange code for access token
    console.log('Exchanging code for token...');
    const tokenResponse = await sso.exchangeCodeForToken(code);

    // Step 3: Get user info from Roben.club
    console.log('Fetching user info...');
    const userInfo = await sso.getUserInfo(tokenResponse.access_token);
    
    // Debug: Log the user info we received
    console.log('User info received from Roben.club:', JSON.stringify(userInfo, null, 2));
    
    // Validate user info
    if (!userInfo.email) {
      console.error('No email in user info:', userInfo);
      throw new Error('User email is required but was not provided by Roben.club');
    }

    // Step 4: Create or update user in Supabase
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Check if user already exists in Supabase Auth (this is the source of truth)
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingAuthUser = existingUsers?.users?.find((u: any) => u.email === userInfo.email);

    let userId: string;

    // Normalize phone once for use below
    const normalizedPhone = normalizeEgyptianPhone(userInfo.phone_number);

    if (existingAuthUser) {
      // User exists in auth, just update their profile
      userId = existingAuthUser.id;
      console.log('Found existing user:', userId);
      
      // Update or create profile data (in case profile doesn't exist)
      const { error: upsertError } = await adminClient
        .from('profiles')
        .upsert({
          id: userId,
          first_name: userInfo.first_name,
          last_name: userInfo.last_name,
          email: userInfo.email,
          phone_number: normalizedPhone || userInfo.phone_number || null,
          metadata: {
            member_id: userInfo.member_id,
            major: userInfo.major,
            team: userInfo.team,
            user_type: userInfo.user_type,
            is_new: userInfo.is_new,
            roben_id: userInfo.id,
          },
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        });

      if (upsertError) {
        console.warn('Failed to update profile:', upsertError);
      } else {
        console.log('Updated existing user profile:', userId);
      }

      // Phone is persisted to profiles.phone_number only; do not update auth.users.phone
    } else {
      // Create new user in Supabase Auth using admin client
      console.log('Creating new user with email:', userInfo.email);
      
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: userInfo.email,
        email_confirm: true, // Auto-confirm email from Roben.club
        user_metadata: {
          full_name: userInfo.full_name,
          first_name: userInfo.first_name,
          last_name: userInfo.last_name,
        },
      });

      if (authError || !authData.user) {
        console.error('Failed to create auth user:', authError);
        console.error('User info that failed:', { email: userInfo.email, full_name: userInfo.full_name });
        throw new Error(`Failed to create user account: ${authError?.message || 'Unknown error'}`);
      }

      userId = authData.user.id;
      console.log('Successfully created auth user:', userId);

      // Create profile in public.profiles using admin client
      const { error: profileError } = await adminClient
        .from('profiles')
        .insert({
          id: userId,
          email: userInfo.email,
          first_name: userInfo.first_name,
          last_name: userInfo.last_name,
          phone_number: normalizedPhone || userInfo.phone_number || null,
          role: 'student', // Default role as specified
          metadata: {
            member_id: userInfo.member_id,
            major: userInfo.major,
            team: userInfo.team,
            user_type: userInfo.user_type,
            is_new: userInfo.is_new,
            roben_id: userInfo.id,
          },
        });

      if (profileError) {
        console.error('Failed to create profile:', profileError);
        throw new Error(`Failed to create user profile: ${profileError.message}`);
      }

      console.log('Created new user:', userId);
    }

    // Store Roben access token in user metadata
    const { error: sessionError } = await adminClient.auth.admin.updateUserById(
      userId,
      {
        user_metadata: {
          roben_access_token: tokenResponse.access_token,
          roben_token_expires_at: Date.now() + (tokenResponse.expires_in * 1000),
          first_name: userInfo.first_name,
          last_name: userInfo.last_name,
        }
      }
    );

    if (sessionError) {
      console.warn('Failed to store Roben token:', sessionError);
    }

    // Generate a secure random password for the user (they won't need it since we use SSO)
    const randomPassword = Math.random().toString(36).slice(-16) + Math.random().toString(36).slice(-16);
    
    // Update the user with a password so we can sign them in
    await adminClient.auth.admin.updateUserById(userId, {
      password: randomPassword,
    });

    console.log('Set temporary password for user:', userId);

    // Now sign in the user with the password to get a session
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: userInfo.email,
      password: randomPassword,
    });

    if (signInError || !signInData.session) {
      console.error('Failed to sign in user:', signInError);
      throw new Error('Failed to sign in user');
    }

    console.log('User signed in successfully:', userId);

    // Get user's role for redirect
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    const role = profile?.role || 'student';

    // Redirect based on role
    let redirectUrl = '/dashboard';
    switch (role) {
      case 'admin':
        redirectUrl = '/admin';
        break;
      case 'instructor':
        redirectUrl = '/instructor';
        break;
      default:
        redirectUrl = '/dashboard';
    }

    // Create response with redirect
    const response = NextResponse.redirect(new URL(redirectUrl, request.url));

    // Set session cookies from the sign-in session
    response.cookies.set('sb-access-token', signInData.session.access_token, {
      path: '/',
      maxAge: signInData.session.expires_in || (60 * 60 * 24 * 7), // 7 days default
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    response.cookies.set('sb-refresh-token', signInData.session.refresh_token, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return response;

  } catch (error) {
    console.error('SSO Callback Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    return NextResponse.redirect(
      new URL(`/auth?error=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }
}
