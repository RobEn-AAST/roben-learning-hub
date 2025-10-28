import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/adminHelpers';

export async function POST(request: NextRequest) {
  try {
    console.log('=== CREATE PROFILE API CALLED ===');
    
    // Get the authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Creating profile for user:', user.id, user.email);
    
    // Use admin client to create profile (bypasses RLS)
    const adminClient = createAdminClient();
    
    // Check if profile already exists
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();
    
    if (existingProfile) {
      console.log('Profile already exists for user:', user.id);
      return NextResponse.json({ profile: existingProfile });
    }
    
    // Create new profile (use first_name/last_name — no full_name column in schema)
    const { data: profile, error: createError } = await adminClient
      .from('profiles')
      .insert([{
        id: user.id,
        email: user.email || '',
        first_name: null,
        last_name: null,
        phone_number: null,
        bio: null,
        avatar_url: null,
        role: 'student' // Default role
      }])
      .select()
      .single();
    
    if (createError) {
      console.error('Profile creation error:', createError);
      return NextResponse.json(
        { error: 'Failed to create profile' },
        { status: 500 }
      );
    }
    
    console.log('Profile created successfully:', profile);
    return NextResponse.json({ profile });
    
  } catch (error) {
    console.error('Create profile API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}