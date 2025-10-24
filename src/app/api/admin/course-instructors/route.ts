import { NextRequest, NextResponse } from 'next/server';
import { 
  removeInstructorServerAction, 
  addInstructorServerAction, 
  getAvailableInstructorsServerAction,
  getCourseInstructorsServerAction 
} from '@/services/courseInstructorServerActions';

// DELETE - Remove instructor from course
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const courseId = url.searchParams.get('courseId');
    const instructorId = url.searchParams.get('instructorId');

    if (!courseId || !instructorId) {
      return NextResponse.json(
        { error: 'Missing courseId or instructorId' },
        { status: 400 }
      );
    }

    await removeInstructorServerAction(courseId, instructorId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Instructor removed successfully' 
    });
  } catch (error) {
    console.error('Error in course instructor DELETE API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove instructor' },
      { 
        status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 
               error instanceof Error && error.message.includes('Only admins') ? 403 : 500 
      }
    );
  }
}

// POST - Add instructor to course
export async function POST(request: NextRequest) {
  try {
    const { courseId, instructorId } = await request.json();

    if (!courseId || !instructorId) {
      return NextResponse.json(
        { error: 'Missing courseId or instructorId' },
        { status: 400 }
      );
    }

    const result = await addInstructorServerAction(courseId, instructorId);
    
    return NextResponse.json({ 
      success: true, 
      id: result.id,
      message: 'Instructor added successfully' 
    });
  } catch (error) {
    console.error('Error in course instructor POST API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add instructor' },
      { 
        status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 
               error instanceof Error && error.message.includes('Only admins') ? 403 : 500 
      }
    );
  }
}

// GET - Get available instructors or course instructors
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const courseId = url.searchParams.get('courseId');

    if (type === 'available') {
      const instructors = await getAvailableInstructorsServerAction();
      return NextResponse.json({ instructors });
    } else if (type === 'course' && courseId) {
      const instructors = await getCourseInstructorsServerAction(courseId);
      return NextResponse.json({ instructors });
    } else if (type === 'all') {
      // Fetch ALL course instructors for all courses
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();
      
      const { data, error } = await supabase
        .from('course_instructors')
        .select(`
          *,
          instructor:instructor_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('is_active', true);
      
      if (error) throw error;
      return NextResponse.json(data || []);
    } else {
      return NextResponse.json(
        { error: 'Missing required parameters. Use ?type=available or ?type=course&courseId=xxx or ?type=all' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in course instructor GET API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch instructors' },
      { 
        status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 
               error instanceof Error && error.message.includes('Admin access') ? 403 : 500 
      }
    );
  }
}