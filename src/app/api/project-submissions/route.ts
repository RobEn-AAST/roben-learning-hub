import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in to submit projects' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { lessonId, submissionUrl, notes, platform } = body;

    // Validate required fields
    if (!lessonId || !submissionUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: lessonId and submissionUrl are required' },
        { status: 400 }
      );
    }

    // Verify the lesson exists and is a project type, and get the project_id
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select(`
        id,
        lesson_type,
        projects!inner(id)
      `)
      .eq('id', lessonId)
      .single();

    if (lessonError) {
      console.error('Lesson lookup error:', lessonError);
      console.error('Looking for lesson ID:', lessonId);
      return NextResponse.json(
        { error: `Lesson not found: ${lessonError.message}` },
        { status: 404 }
      );
    }

    if (!lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    if (lesson.lesson_type !== 'project') {
      return NextResponse.json(
        { error: 'This lesson is not a project type' },
        { status: 400 }
      );
    }

    // @ts-ignore - projects is an array from the join
    const projectId = lesson.projects?.[0]?.id || lesson.projects?.id;
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'No project found for this lesson' },
        { status: 404 }
      );
    }

    // Check if user already has a submission for this project
    const { data: existingSubmission } = await supabase
      .from('project_submissions')
      .select('id, status')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single();

    if (existingSubmission) {
      // Update existing submission if it's pending or rejected
      if (existingSubmission.status === 'submitted' || existingSubmission.status === 'resubmission_required') {
        const { data: updatedSubmission, error: updateError } = await supabase
          .from('project_submissions')
          .update({
            submission_link: submissionUrl,
            submission_platform: platform || 'other',
            submitted_at: new Date().toISOString(),
            status: 'submitted',
          })
          .eq('id', existingSubmission.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating submission:', updateError);
          console.error('Update data:', { submissionUrl, platform, submissionId: existingSubmission.id });
          return NextResponse.json(
            { error: `Failed to update project submission: ${updateError.message}` },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Project resubmitted successfully',
          submission: updatedSubmission,
        });
      } else {
        return NextResponse.json(
          { error: 'You have already submitted this project and it has been reviewed' },
          { status: 400 }
        );
      }
    }

    // Create new submission
    const { data: newSubmission, error: insertError } = await supabase
      .from('project_submissions')
      .insert({
        project_id: projectId,
        user_id: user.id,
        submission_link: submissionUrl,
        submission_platform: platform || 'other',
        status: 'submitted',
        metadata: notes ? { notes } : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating submission:', insertError);
      console.error('Insert data:', { projectId, userId: user.id, submissionUrl, platform });
      return NextResponse.json(
        { error: `Failed to submit project: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Project submitted successfully',
      submission: newSubmission,
    });
  } catch (error) {
    console.error('Error in project submission:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lessonId');
    const projectId = searchParams.get('projectId');

    let query = supabase
      .from('project_submissions')
      .select(`
        *,
        project:projects(id, title, lesson_id),
        student:profiles!project_submissions_user_id_fkey(id, full_name, email),
        reviewer:profiles!project_submissions_reviewed_by_fkey(id, full_name)
      `)
      .order('submitted_at', { ascending: false });

    // Students can only see their own submissions
    if (profile?.role === 'student') {
      query = query.eq('user_id', user.id);
    }

    // Filter by project if provided
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    
    // Filter by lesson if provided (need to join through projects)
    if (lessonId && !projectId) {
      // Get the project_id for this lesson first
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('lesson_id', lessonId)
        .single();
      
      if (project) {
        query = query.eq('project_id', project.id);
      }
    }

    const { data: submissions, error } = await query;

    if (error) {
      console.error('Error fetching submissions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch submissions' },
        { status: 500 }
      );
    }

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error('Error in GET project submissions:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
