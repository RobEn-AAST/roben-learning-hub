import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { projectService } from '@/services/projectService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const project = await projectService.getProjectById(id, clientToUse);
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('❌ GET /api/admin/projects/[id] - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
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

    const body = await request.json();
    const { lesson_id, title, description, submission_instructions, submission_platform } = body;

    const updateData: any = {};
    if (lesson_id !== undefined) updateData.lesson_id = lesson_id;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (submission_instructions !== undefined) updateData.submission_instructions = submission_instructions;
    if (submission_platform !== undefined) updateData.submission_platform = submission_platform;

    // Role-based client selection
    const clientToUse = profile?.role === 'admin' ? 'admin' : 'regular';
    
    const project = await projectService.updateProject(id, updateData, clientToUse);
    return NextResponse.json(project);
  } catch (error) {
    console.error('❌ PUT /api/admin/projects/[id] - Error:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
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

    await projectService.deleteProject(id, clientToUse);
    
    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('❌ DELETE /api/admin/projects/[id] - Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
