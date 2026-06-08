import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { projectService } from '@/services/projectService';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role to determine which client to use
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Role-based client selection
    const clientToUse = profile?.role === 'admin' ? 'admin' : 'regular';

    const projects = await projectService.getAllProjects(clientToUse);
    return NextResponse.json(projects);
  } catch (error) {
    console.error('❌ GET /api/admin/projects - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        error: 'Unauthorized',
        message: 'You must be logged in to create projects'
      }, { status: 401 });
    }

    // Check user role to determine which client to use
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'You do not have permission to create projects'
      }, { status: 403 });
    }

    const body = await request.json();

    const { lesson_id, title, description, submission_instructions, submission_platform } = body;

    // Validate required fields with detailed error messages
    const missingFields: string[] = [];
    if (!lesson_id) missingFields.push('lesson_id');
    if (!title) missingFields.push('title');
    if (!description) missingFields.push('description');

    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: `Missing required fields: ${missingFields.join(', ')}`,
          message: `Please provide all required fields: ${missingFields.join(', ')}`,
          missingFields
        },
        { status: 400 }
      );
    }

    // Role-based client selection
    const clientToUse = profile?.role === 'admin' ? 'admin' : 'regular';

    const project = await projectService.createProject({
      lesson_id,
      title,
      description,
      submission_instructions: submission_instructions || null,
      submission_platform: submission_platform || null
    }, clientToUse);

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('❌ POST /api/admin/projects - Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        error: `Failed to create project: ${errorMessage}`,
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
