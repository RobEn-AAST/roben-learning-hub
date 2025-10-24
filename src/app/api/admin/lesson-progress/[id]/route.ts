import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * PUT /api/admin/lesson-progress/[id]
 * Update lesson progress
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { 
          error: 'Missing progress ID',
          hint: 'Provide a valid progress ID in the URL'
        },
        { status: 400 }
      );
    }

    const { status, progress } = body;

    // Build update data
    const updateData: any = {};
    
    if (status !== undefined) {
      updateData.status = status;
      
      // Auto-update progress based on status
      if (status === 'completed') {
        updateData.progress = 100;
        updateData.completed_at = new Date().toISOString();
      } else if (status === 'not_started') {
        updateData.progress = 0;
        updateData.completed_at = null;
      }
    }
    
    if (progress !== undefined && status !== 'completed') {
      updateData.progress = progress;
      
      // Auto-update status based on progress
      if (progress === 0) {
        updateData.status = 'not_started';
      } else if (progress === 100) {
        updateData.status = 'completed';
        updateData.completed_at = new Date().toISOString();
      } else if (progress > 0 && progress < 100) {
        updateData.status = 'in_progress';
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { 
          error: 'No fields to update',
          hint: 'Provide status or progress in the request body'
        },
        { status: 400 }
      );
    }

    // Update progress
    const { data, error } = await supabase
      .from('lesson_progress')
      .update(updateData)
      .eq('id', id)
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
      console.error('❌ Error updating lesson progress:', error);
      return NextResponse.json(
        { 
          error: 'Failed to update lesson progress', 
          details: error.message,
          hint: 'Check if the progress record exists and RLS policies allow updates'
        },
        { status: 500 }
      );
    }

    console.log('✅ Lesson progress updated successfully:', id);

    return NextResponse.json(
      { 
        message: 'Lesson progress updated successfully', 
        progress: data 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ Unexpected error in PUT /api/admin/lesson-progress/[id]:', error);
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
 * DELETE /api/admin/lesson-progress/[id]
 * Delete lesson progress
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { 
          error: 'Missing progress ID',
          hint: 'Provide a valid progress ID in the URL'
        },
        { status: 400 }
      );
    }

    // Delete progress
    const { error } = await supabase
      .from('lesson_progress')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error deleting lesson progress:', error);
      return NextResponse.json(
        { 
          error: 'Failed to delete lesson progress', 
          details: error.message,
          hint: 'Check if the progress record exists and RLS policies allow deletion'
        },
        { status: 500 }
      );
    }

    console.log('✅ Lesson progress deleted successfully:', id);

    return NextResponse.json(
      { message: 'Lesson progress deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ Unexpected error in DELETE /api/admin/lesson-progress/[id]:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
