import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { submissionService } from '@/services/submissionService';
import { activityLogService } from '@/services/activityLogService';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ GET /api/submissions - Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('🔍 GET /api/submissions - User ID:', user.id);
    console.log('🔍 GET /api/submissions - User role:', profile?.role);

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const project_id = searchParams.get('project_id');
    const user_id = searchParams.get('user_id');
    const status = searchParams.get('status');

    const filters: any = {};
    if (project_id) filters.project_id = project_id;
    if (user_id) filters.user_id = user_id;
    if (status) filters.status = status;

    // Role-based client selection
    const clientToUse = (profile?.role === 'admin' || profile?.role === 'instructor') ? 'admin' : 'regular';
    console.log('🎯 GET /api/submissions - Using client type:', clientToUse);

    const submissions = await submissionService.getAllSubmissions(filters, clientToUse);
    console.log('✅ GET /api/submissions - Successfully fetched', submissions?.length || 0, 'submissions');
    return NextResponse.json(submissions);
  } catch (error) {
    console.error('❌ GET /api/submissions - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ POST /api/submissions - Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { project_id, submission_link, submission_platform } = body;

    console.log('📝 POST /api/submissions - Creating submission:', { project_id, submission_platform });

    if (!project_id || !submission_link || !submission_platform) {
      console.log('❌ POST /api/submissions - Missing required fields');
      return NextResponse.json(
        { error: 'project_id, submission_link, and submission_platform are required' },
        { status: 400 }
      );
    }

    const submission = await submissionService.createSubmission({
      project_id,
      submission_link,
      submission_platform
    }, user.id);

    // Log the submission creation
    await activityLogService.logActivity({
      action: 'CREATE',
      table_name: 'project_submissions',
      record_id: submission.id,
      description: `Submitted project ${project_id} via ${submission_platform}`
    });

    console.log('✅ POST /api/submissions - Submission created successfully:', submission.id);
    return NextResponse.json(submission, { status: 201 });
  } catch (error: any) {
    console.error('❌ POST /api/submissions - Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create submission' },
      { status: 500 }
    );
  }
}
