import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/adminHelpers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const supabase = await createClient();
    const { lessonId } = await params;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get lesson details to verify it exists
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id, module_id')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    // Check if progress record exists
    const { data: existingProgress } = await supabase
      .from('lesson_progress')
      .select('id, status')
      .eq('lesson_id', lessonId)
      .eq('user_id', user.id)
      .single();

    if (existingProgress) {
      // Update existing progress using admin client to ensure consistency
      const adminClient = createAdminClient();
      const { data: updatedProgress, error: updateError } = await adminClient
        .from('lesson_progress')
        .update({
          status: 'completed',
          progress: 100,
          completed_at: new Date().toISOString()
        })
        .eq('id', existingProgress.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating progress:', updateError);
        console.error('Update error details:', { code: updateError.code, message: updateError.message, details: updateError.details });
        return NextResponse.json(
          { error: 'Failed to update progress' },
          { status: 500 }
        );
      }

      console.log('Successfully updated lesson progress:', { lessonId, userId: user.id, progressId: existingProgress.id });
      return NextResponse.json({
        success: true,
        progress: updatedProgress
      });
    } else {
      // Get module and course ID to ensure enrollment
      const { data: moduleData } = await supabase
        .from('modules')
        .select('course_id')
        .eq('id', lesson.module_id)
        .single();
      
      // Check if the user is enrolled in this course
      if (moduleData) {
        const { data: enrollment } = await supabase
          .from('course_enrollments')
          .select('id')
          .eq('course_id', moduleData.course_id)
          .eq('user_id', user.id)
          .single();
        
        if (!enrollment) {
          return NextResponse.json(
            { error: 'User not enrolled in this course' },
            { status: 403 }
          );
        }
      }
      
      // Create new progress record using admin client to bypass RLS issues
      const adminClient = createAdminClient();
      const { data: newProgress, error: insertError } = await adminClient
        .from('lesson_progress')
        .insert({
          lesson_id: lessonId,
          user_id: user.id,
          status: 'completed',
          progress: 100,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating progress:', insertError);
        console.error('Insert error details:', { code: insertError.code, message: insertError.message, details: insertError.details });
        
        // For 42501 errors, RLS is blocking the insert
        if (insertError.code === '42501') {
          return NextResponse.json(
            { error: 'Permission denied - RLS policy is preventing this action', details: insertError.message },
            { status: 403 }
          );
        }
        
        return NextResponse.json(
          { error: 'Failed to create progress', details: insertError.message },
          { status: 500 }
        );
      }

      console.log('Successfully created lesson progress:', { lessonId, userId: user.id, progressId: newProgress.id });
      return NextResponse.json({
        success: true,
        progress: newProgress
      });
    }

  } catch (error) {
    console.error('Error marking lesson complete:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get progress for a specific lesson
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const supabase = await createClient();
    const { lessonId } = await params;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: progress } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('lesson_id', lessonId)
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      progress: progress || null,
      completed: progress?.status === 'completed' || false
    });

  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
