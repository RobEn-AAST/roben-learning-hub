import { NextRequest, NextResponse } from 'next/server';
import { serverLessonService } from '@/services/lessonService';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Create admin client with service role key to bypass RLS
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

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use admin client to bypass RLS and get all profiles
    const adminClient = createAdminClient();
    
    const { data: allProfiles, error: allError } = await adminClient
      .from('profiles')
      .select('id, full_name, role')
      .order('full_name');
    
    if (allError) {
      console.error('Error fetching profiles:', allError);
      return NextResponse.json(
        { error: 'Failed to fetch profiles' },
        { status: 500 }
      );
    }
    
    // Filter for instructors (supports both 'instructor' and 'teacher' roles)
    const instructorProfiles = allProfiles?.filter((profile: any) => {
      const role = profile.role?.toLowerCase();
      return role === 'instructor' || role === 'teacher';
    }) || [];
    
    // If no specific instructor roles found, return all profiles so admin can select anyone
    const instructors = instructorProfiles.length > 0 ? instructorProfiles : (allProfiles || []);
    
    return NextResponse.json(instructors);
  } catch (error) {
    console.error('Error fetching instructors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch instructors' },
      { status: 500 }
    );
  }
}