import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, checkAdminPermission } from '@/lib/adminHelpers';

// GET - Get specific course by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const permissionError = await checkAdminPermission();
    if (permissionError) return permissionError;

    const adminClient = createAdminClient();
    const { id } = await params;

    const { data, error } = await adminClient
      .from('courses')
      .select(`
        *,
        creator:profiles!courses_created_by_fkey (id, full_name, email),
        modules (
          id,
          title,
          description,
          position,
          lessons (count)
        ),
        course_enrollments (
          id,
          role,
          enrolled_at,
          profiles!course_enrollments_user_id_fkey (full_name, email)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error getting course:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get course' },
      { status: 500 }
    );
  }
}

// PUT - Update course
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('=== COURSE PUT API CALLED ===');
    console.log('Request method:', request.method);
    console.log('Request URL:', request.url);
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    
    const permissionError = await checkAdminPermission();
    if (permissionError) {
      console.log('Permission check failed, returning error response');
      return permissionError;
    }

    const adminClient = createAdminClient();
    const body = await request.json();
    const { id } = await params;
    
    console.log('Updating course:', { id, body });

    // Extract instructor_ids before updating the course
    const { instructor_ids, ...courseUpdateData } = body;
    
    // Remove undefined values and id from update data
    const updateData = { ...courseUpdateData };
    delete updateData.id;
    delete updateData.created_at;
    
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    console.log('Processed update data (without instructor_ids):', updateData);
    console.log('Instructor IDs to handle separately:', instructor_ids);

    // Update course with admin client
    const { data, error } = await adminClient
      .from('courses')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Database update error:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }
      throw error;
    }

    console.log('Course updated successfully:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('=== COURSE UPDATE ERROR ===');
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Full error:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update course' },
      { status: 500 }
    );
  }
}

// DELETE - Delete course
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const permissionError = await checkAdminPermission();
    if (permissionError) return permissionError;

    const adminClient = createAdminClient();
    const { id } = await params;

    // First check if course exists and get its title for logging
    const { data: course } = await adminClient
      .from('courses')
      .select('id, title')
      .eq('id', id)
      .single();

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Delete the course using admin client (bypasses RLS)
    const { error } = await adminClient
      .from('courses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Course deletion error:', error);
      throw new Error(`Failed to delete course: ${error.message}`);
    }

    return NextResponse.json({ 
      message: 'Course deleted successfully',
      deletedCourse: { id, title: course.title }
    });
  } catch (error) {
    console.error('Error in course DELETE API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete course' },
      { status: 500 }
    );
  }
}