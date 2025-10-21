import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { submissionService } from '@/services/submissionService';
import { activityLogService } from '@/services/activityLogService';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ GET /api/submissions/[id] - Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const clientToUse = (profile?.role === 'admin' || profile?.role === 'instructor') ? 'admin' : 'regular';
    const submission = await submissionService.getSubmissionById(params.id, clientToUse);

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    console.log('✅ GET /api/submissions/[id] - Submission fetched:', params.id);
    return NextResponse.json(submission);
  } catch (error) {
    console.error('❌ GET /api/submissions/[id] - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submission' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ PUT /api/submissions/[id] - Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const body = await request.json();
    const { submission_link, submission_platform, status, feedback, grade } = body;

    console.log('📝 PUT /api/submissions/[id] - Updating submission:', params.id);

    const updateData: any = {};
    if (submission_link !== undefined) updateData.submission_link = submission_link;
    if (submission_platform !== undefined) updateData.submission_platform = submission_platform;
    if (status !== undefined) {
      updateData.status = status;
      
      // If instructor/admin is reviewing, set reviewed_by
      if (['reviewed', 'approved', 'rejected', 'resubmission_required'].includes(status)) {
        if (profile?.role === 'admin' || profile?.role === 'instructor') {
          updateData.reviewed_by = user.id;
        }
      }
    }
    if (feedback !== undefined) updateData.feedback = feedback;
    if (grade !== undefined) updateData.grade = grade;

    const clientToUse = (profile?.role === 'admin' || profile?.role === 'instructor') ? 'admin' : 'regular';
    const submission = await submissionService.updateSubmission(params.id, updateData, clientToUse);

    // Log the submission update
    await activityLogService.logActivity({
      action: 'UPDATE',
      table_name: 'project_submissions',
      record_id: submission.id,
      description: `Updated submission status: ${status || 'changed'}`
    });

    console.log('✅ PUT /api/submissions/[id] - Submission updated:', params.id);
    return NextResponse.json(submission);
  } catch (error: any) {
    console.error('❌ PUT /api/submissions/[id] - Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update submission' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ DELETE /api/submissions/[id] - Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('🗑️ DELETE /api/submissions/[id] - Deleting submission:', params.id);

    const clientToUse = (profile?.role === 'admin' || profile?.role === 'instructor') ? 'admin' : 'regular';
    await submissionService.deleteSubmission(params.id, clientToUse);

    // Log the submission deletion
    await activityLogService.logActivity({
      action: 'DELETE',
      table_name: 'project_submissions',
      record_id: params.id,
      description: 'Deleted project submission'
    });

    console.log('✅ DELETE /api/submissions/[id] - Submission deleted:', params.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ DELETE /api/submissions/[id] - Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete submission' },
      { status: 500 }
    );
  }
}
