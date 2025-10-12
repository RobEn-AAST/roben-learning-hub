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

    // Create admin client to bypass RLS for all queries
    const adminClient = createAdminClient();
    
    // Get lesson details with position info for sequential validation
    const { data: lesson, error: lessonError } = await adminClient
      .from('lessons')
      .select('id, module_id, position, title')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    // Check if progress record exists (get all records to detect duplicates)
    const { data: existingProgressRecords } = await adminClient
      .from('lesson_progress')
      .select('id, status, created_at')
      .eq('lesson_id', lessonId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    let existingProgress = null;
    
    // If multiple records exist (duplicates), keep only the most recent one
    if (existingProgressRecords && existingProgressRecords.length > 0) {
      existingProgress = existingProgressRecords[0]; // Most recent due to ordering
      
      // Delete duplicate records if they exist
      if (existingProgressRecords.length > 1) {
        const duplicateIds = existingProgressRecords.slice(1).map(record => record.id);
        await adminClient
          .from('lesson_progress')
          .delete()
          .in('id', duplicateIds);
        
        console.log(`Cleaned up ${duplicateIds.length} duplicate progress records for lesson ${lessonId}`);
      }
    }

    if (existingProgress) {
      // Update existing progress using admin client to ensure consistency
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
      // Get module and course info
      const { data: moduleData } = await adminClient
        .from('modules')
        .select('course_id, position')
        .eq('id', lesson.module_id)
        .single();
      
      // Check enrollment using admin client to bypass RLS
      if (moduleData) {
        const { data: enrollment } = await adminClient
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

        // ENFORCE SEQUENTIAL LESSON COMPLETION
        // Check if previous lessons in the same module are completed
        if (lesson.position > 1) {
          const { data: previousLessons } = await adminClient
            .from('lessons')
            .select('id')
            .eq('module_id', lesson.module_id)
            .lt('position', lesson.position)
            .order('position');

          if (previousLessons && previousLessons.length > 0) {
            // Check if all previous lessons are completed
            const { data: completedPrevious } = await adminClient
              .from('lesson_progress')
              .select('lesson_id')
              .eq('user_id', user.id)
              .eq('status', 'completed')
              .in('lesson_id', previousLessons.map(l => l.id));

            const completedCount = completedPrevious?.length || 0;
            const requiredCount = previousLessons.length;

            if (completedCount < requiredCount) {
              return NextResponse.json({
                error: 'Please complete previous lessons first',
                details: `You must complete lesson ${lesson.position - 1} before accessing lesson ${lesson.position}`
              }, { status: 400 });
            }
          }
        }

        // Also check if previous modules are completed (if lesson is in position 1 of a later module)
        if (lesson.position === 1 && moduleData.position > 1) {
          const { data: previousModules } = await adminClient
            .from('modules')
            .select(`
              id,
              lessons (
                id
              )
            `)
            .eq('course_id', moduleData.course_id)
            .lt('position', moduleData.position);

          if (previousModules && previousModules.length > 0) {
            const allPreviousLessonIds = previousModules.flatMap(m => m.lessons.map((l: any) => l.id));
            
            if (allPreviousLessonIds.length > 0) {
              const { data: completedPreviousModuleLessons } = await adminClient
                .from('lesson_progress')
                .select('lesson_id')
                .eq('user_id', user.id)
                .eq('status', 'completed')
                .in('lesson_id', allPreviousLessonIds);

              const completedCount = completedPreviousModuleLessons?.length || 0;
              
              if (completedCount < allPreviousLessonIds.length) {
                return NextResponse.json({
                  error: 'Please complete all previous modules first',
                  details: `You must complete all lessons in previous modules before starting module ${moduleData.position}`
                }, { status: 400 });
              }
            }
          }
        }
      }
      
      // Create new progress record using admin client to bypass RLS issues
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

    // Use admin client to bypass RLS for progress queries
    const adminClient = createAdminClient();
    const { data: progress } = await adminClient
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
