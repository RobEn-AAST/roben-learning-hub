import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * DELETE /api/admin/enrollments/[id]
 * Delete a course enrollment
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
          error: 'Missing enrollment ID',
          hint: 'Provide a valid enrollment ID in the URL'
        },
        { status: 400 }
      );
    }

    // Delete enrollment
    const { error } = await supabase
      .from('course_enrollments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error deleting enrollment:', error);
      return NextResponse.json(
        { 
          error: 'Failed to delete enrollment', 
          details: error.message,
          hint: 'Check if the enrollment exists and RLS policies allow deletion'
        },
        { status: 500 }
      );
    }

    console.log('✅ Enrollment deleted successfully:', id);

    return NextResponse.json(
      { message: 'Enrollment deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ Unexpected error in DELETE /api/admin/enrollments/[id]:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
