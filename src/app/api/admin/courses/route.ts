import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, checkAdminPermission } from '@/lib/adminHelpers';

// GET - Get all courses with admin privileges
export async function GET(request: NextRequest) {
  try {
    const permissionError = await checkAdminPermission();
    if (permissionError) return permissionError;

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    const adminClient = createAdminClient();

    // Get courses with creator info using admin client (bypasses RLS)
    const { data: courses, error: coursesError, count } = await adminClient
      .from('courses')
      .select(`
        *,
        creator:profiles!courses_created_by_fkey (id, full_name, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (coursesError) {
      console.error('Courses query error:', coursesError);
      throw new Error(`Failed to fetch courses: ${coursesError.message}`);
    }

    return NextResponse.json({ 
      courses: courses || [], 
      total: count || 0 
    });
  } catch (error) {
    console.error('Error in courses GET API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}

// POST - Create new course
export async function POST(request: NextRequest) {
  try {
    const permissionError = await checkAdminPermission();
    if (permissionError) return permissionError;

    const adminClient = createAdminClient();
    const body = await request.json();
    
    // Generate slug from title
    const generateSlug = (title: string): string => {
      return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .trim() || 'course';
    };

    const baseSlug = generateSlug(body.title);
    let slug = baseSlug;
    let counter = 1;

    // Ensure slug is unique
    while (true) {
      const { data: existingCourse } = await adminClient
        .from('courses')
        .select('id')
        .eq('slug', slug)
        .single();

      if (!existingCourse) break;
      
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Extract instructor_ids before creating course
    const { instructor_ids, ...courseData } = body;

    // Create course with admin client
    const { data: course, error } = await adminClient
      .from('courses')
      .insert([{
        ...courseData,
        slug,
        metadata: courseData.metadata || {}
      }])
      .select()
      .single();

    if (error) {
      console.error('Course creation error:', error);
      throw new Error(`Failed to create course: ${error.message}`);
    }

    // Handle instructor assignments if provided
    if (instructor_ids && instructor_ids.length > 0 && course.created_by) {
      try {
        const instructorAssignments = instructor_ids.map((instructorId: string) => ({
          course_id: course.id,
          instructor_id: instructorId,
          assigned_by: course.created_by,
          assigned_at: new Date().toISOString()
        }));

        const { error: assignmentError } = await adminClient
          .from('course_instructors')
          .insert(instructorAssignments);

        if (assignmentError) {
          console.error('Instructor assignment error:', assignmentError);
          // Don't fail the course creation, just log the error
          console.warn('Course created successfully but instructor assignment failed');
        }
      } catch (assignmentError) {
        console.error('Failed to assign instructors:', assignmentError);
        // Don't fail the course creation
      }
    }

    return NextResponse.json(course);
  } catch (error) {
    console.error('Error in courses POST API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create course' },
      { status: 500 }
    );
  }
}