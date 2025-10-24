import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/lesson-progress
 * Fetch lesson progress with filters and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const lessonId = searchParams.get('lessonId');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    
    const offset = (page - 1) * limit;

    // Build query - optimized to reduce nested joins
    let query = supabase
      .from('lesson_progress')
      .select(`
        id,
        lesson_id,
        user_id,
        status,
        progress,
        started_at,
        completed_at,
        lessons!inner (
          title,
          lesson_type,
          module_id
        ),
        profiles!inner (
          first_name,
          last_name,
          email
        )
      `, { count: 'exact' });

    // Apply filters
    if (lessonId) {
      query = query.eq('lesson_id', lessonId);
    }
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (search) {
      // Search in user's first_name, last_name or lesson title
      query = query.or(`profiles.first_name.ilike.%${search}%,profiles.last_name.ilike.%${search}%,lessons.title.ilike.%${search}%`);
    }

    // Order and paginate
    query = query
      .order('started_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Error fetching lesson progress:', error);
      return NextResponse.json(
        { 
          error: 'Failed to fetch lesson progress', 
          details: error.message,
          hint: 'Check if RLS policies allow reading lesson_progress'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      progress: data || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('❌ Unexpected error in GET /api/admin/lesson-progress:', error);
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
 * POST /api/admin/lesson-progress
 * Create new lesson progress record
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    const { lesson_id, user_id, status, progress } = body;

    // Validate required fields
    if (!lesson_id || !user_id) {
      return NextResponse.json(
        { 
          error: 'Missing required fields', 
          details: 'lesson_id and user_id are required',
          hint: 'Ensure all fields are provided in the request body'
        },
        { status: 400 }
      );
    }

    // Check if progress already exists
    const { data: existing, error: checkError } = await supabase
      .from('lesson_progress')
      .select('id')
      .eq('lesson_id', lesson_id)
      .eq('user_id', user_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error checking existing progress:', checkError);
      return NextResponse.json(
        { 
          error: 'Failed to check existing progress', 
          details: checkError.message
        },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { 
          error: 'Progress record already exists', 
          details: 'This user already has progress for this lesson',
          hint: 'Try updating the existing progress instead'
        },
        { status: 409 }
      );
    }

    // Create progress record
    const progressData: any = {
      lesson_id,
      user_id,
      status: status || 'not_started',
      progress: progress || 0,
      started_at: new Date().toISOString()
    };

    if (status === 'completed') {
      progressData.completed_at = new Date().toISOString();
      progressData.progress = 100;
    }

    const { data, error } = await supabase
      .from('lesson_progress')
      .insert(progressData)
      .select(`
        id,
        lesson_id,
        user_id,
        status,
        progress,
        started_at,
        completed_at,
        lessons (
          id,
          title,
          lesson_type,
          modules (
            id,
            title,
            courses (
              id,
              title
            )
          )
        ),
        profiles (
          id,
          first_name,
          last_name,
          email,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('❌ Error creating lesson progress:', error);
      return NextResponse.json(
        { 
          error: 'Failed to create lesson progress', 
          details: error.message,
          hint: 'Check if the lesson and user exist, and RLS policies allow insertion'
        },
        { status: 500 }
      );
    }

    console.log('✅ Lesson progress created successfully:', data.id);

    return NextResponse.json(
      { 
        message: 'Lesson progress created successfully', 
        progress: data 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('❌ Unexpected error in POST /api/admin/lesson-progress:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
