import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/enrollments
 * Fetch course enrollments with filters and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const courseId = searchParams.get('courseId');
    const role = searchParams.get('role');
    const search = searchParams.get('search');
    
    const offset = (page - 1) * limit;

    // Build query - optimized with minimal fields
    let query = supabase
      .from('course_enrollments')
      .select(`
        id,
        course_id,
        user_id,
        role,
        enrolled_at,
        courses!inner (
          title
        ),
        profiles!inner (
          full_name,
          email
        )
      `, { count: 'exact' });

    // Apply filters
    if (courseId) {
      query = query.eq('course_id', courseId);
    }
    
    if (role) {
      query = query.eq('role', role);
    }
    
    if (search) {
      // Search in user's full_name or email
      query = query.or(`profiles.full_name.ilike.%${search}%,profiles.email.ilike.%${search}%`);
    }

    // Order and paginate
    query = query
      .order('enrolled_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Error fetching enrollments:', error);
      return NextResponse.json(
        { 
          error: 'Failed to fetch enrollments', 
          details: error.message,
          hint: 'Check if RLS policies allow reading course_enrollments'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      enrollments: data || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('❌ Unexpected error in GET /api/admin/enrollments:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/enrollments
 * Create a new course enrollment
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    const { course_id, user_id, role } = body;

    // Validate required fields
    if (!course_id || !user_id || !role) {
      return NextResponse.json(
        { 
          error: 'Missing required fields', 
          details: 'course_id, user_id, and role are required',
          hint: 'Ensure all fields are provided in the request body'
        },
        { status: 400 }
      );
    }

    // Check if enrollment already exists
    const { data: existing, error: checkError } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('course_id', course_id)
      .eq('user_id', user_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error checking existing enrollment:', checkError);
      return NextResponse.json(
        { 
          error: 'Failed to check existing enrollment', 
          details: checkError.message
        },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { 
          error: 'Enrollment already exists', 
          details: 'This user is already enrolled in this course',
          hint: 'Try updating the existing enrollment instead'
        },
        { status: 409 }
      );
    }

    // Create enrollment
    const { data, error } = await supabase
      .from('course_enrollments')
      .insert({
        course_id,
        user_id,
        role
      })
      .select(`
        id,
        course_id,
        user_id,
        role,
        enrolled_at,
        courses (
          id,
          title,
          slug
        ),
        profiles (
          id,
          full_name,
          email,
          avatar_url,
          role
        )
      `)
      .single();

    if (error) {
      console.error('❌ Error creating enrollment:', error);
      return NextResponse.json(
        { 
          error: 'Failed to create enrollment', 
          details: error.message,
          hint: 'Check if the course and user exist, and RLS policies allow insertion'
        },
        { status: 500 }
      );
    }

    console.log('✅ Enrollment created successfully:', data.id);

    return NextResponse.json(
      { 
        message: 'Enrollment created successfully', 
        enrollment: data 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('❌ Unexpected error in POST /api/admin/enrollments:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
