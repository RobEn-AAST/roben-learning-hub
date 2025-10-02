import { NextRequest, NextResponse } from 'next/server';
import { lessonService } from '@/services/lessonService';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, checkAdminOrInstructorPermission } from '@/lib/adminHelpers';
import { activityLogService } from '@/services/activityLogService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check admin or instructor permission
    const permissionError = await checkAdminOrInstructorPermission();
    if (permissionError) return permissionError;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Check user role to determine which client to use
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user!.id)
      .single();

    const isAdmin = profile?.role === 'admin';
    // Use admin client for admins (bypasses RLS), regular client for instructors (respects RLS)
    const clientToUse = isAdmin ? adminClient : supabase;

    const lesson = await lessonService.getLessonById(id);
    
    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    return NextResponse.json(lesson);
  } catch (error) {
    console.error('Error fetching lesson:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lesson' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check admin or instructor permission
    const permissionError = await checkAdminOrInstructorPermission();
    if (permissionError) return permissionError;

    const body = await request.json();
    const { title, lesson_type, position, status, instructor_id, metadata } = body;

    // Validate lesson_type if provided
    if (lesson_type && !['video', 'article', 'project', 'quiz'].includes(lesson_type)) {
      return NextResponse.json(
        { error: 'Invalid lesson_type. Must be one of: video, article, project, quiz' },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (status && !['visible', 'hidden'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: visible, hidden' },
        { status: 400 }
      );
    }

    const updateData = {
      ...(title && { title }),
      ...(lesson_type && { lesson_type }),
      ...(position !== undefined && { position }),
      ...(status && { status }),
      ...(instructor_id && { instructor_id }),
      ...(metadata && { metadata })
    };

    // Check user role to determine which client to use
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user!.id)
      .single();

    const isAdmin = profile?.role === 'admin';
    // Use admin client for admins (bypasses RLS), regular client for instructors (respects RLS)
    const clientToUse = isAdmin ? adminClient : supabase;

    // Update the lesson using the appropriate client
    const { data: updatedLesson, error: updateError } = await clientToUse
      .from('lessons')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        modules!inner(
          id,
          title,
          course_id,
          courses!inner(
            id,
            title
          )
        ),
        profiles(
          id,
          full_name
        )
      `)
      .single();

    if (updateError) {
      console.error('Update lesson error:', updateError);
      throw new Error(`Failed to update lesson: ${updateError.message}`);
    }
    
    // Log the action
    await activityLogService.logActivity({
      action: 'UPDATE',
      resource_type: 'lessons',
      resource_id: id,
      details: `Updated lesson: ${updatedLesson.title}`
    });

    return NextResponse.json(updatedLesson);
  } catch (error) {
    console.error('Error updating lesson:', error);
    return NextResponse.json(
      { error: 'Failed to update lesson' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check admin or instructor permission
    const permissionError = await checkAdminOrInstructorPermission();
    if (permissionError) return permissionError;

    // Check user role to determine which client to use
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user!.id)
      .single();

    const isAdmin = profile?.role === 'admin';
    // Use admin client for admins (bypasses RLS), regular client for instructors (respects RLS)
    const clientToUse = isAdmin ? adminClient : supabase;

    // Get lesson details before deletion for logging
    const { data: lesson, error: fetchError } = await clientToUse
      .from('lessons')
      .select('id, title')
      .eq('id', id)
      .single();
    
    if (fetchError || !lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Delete the lesson using the appropriate client
    console.log(`[DELETE LESSON] Attempting to delete lesson with ID: ${id}`);
    console.log(`[DELETE LESSON] User role: ${profile?.role}, Using client: ${isAdmin ? 'admin' : 'regular'}`);
    
    const { error: deleteError, count } = await clientToUse
      .from('lessons')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[DELETE LESSON] Delete error details:', {
        message: deleteError.message,
        details: deleteError.details,
        hint: deleteError.hint,
        code: deleteError.code
      });
      throw new Error(`Failed to delete lesson: ${deleteError.message}`);
    }

    console.log(`[DELETE LESSON] Delete operation completed. Affected rows: ${count}`);

    console.log(`[DELETE LESSON] Successfully deleted lesson: ${lesson.title} (${id})`);
    
    // Verify deletion by trying to fetch the lesson again
    const { data: verifyLesson } = await clientToUse
      .from('lessons')
      .select('id')
      .eq('id', id)
      .single();
    
    if (verifyLesson) {
      console.error('[DELETE LESSON] ERROR: Lesson still exists after deletion attempt!');
      return NextResponse.json({ error: 'Failed to delete lesson - lesson still exists' }, { status: 500 });
    } else {
      console.log('[DELETE LESSON] VERIFIED: Lesson successfully removed from database');
    }
    
    // Log the action
    await activityLogService.logActivity({
      action: 'DELETE',
      resource_type: 'lessons',
      resource_id: id,
      details: `Deleted lesson: ${lesson.title}`
    });

    return NextResponse.json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    return NextResponse.json(
      { error: 'Failed to delete lesson' },
      { status: 500 }
    );
  }
}