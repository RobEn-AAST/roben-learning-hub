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
      console.log('❌ GET /api/admin/projects/[id] - Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role to determine which client to use
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('🔍 GET /api/admin/projects/[id] - User role:', profile?.role, 'for project:', id);

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Role-based client selection
    const clientToUse = profile?.role === 'admin' ? 'admin' : 'regular';
    console.log('🎯 GET /api/admin/projects/[id] - Using client type:', clientToUse);

    const project = await projectService.getProjectById(id, clientToUse);
    
    if (!project) {
      console.log('❌ GET /api/admin/projects/[id] - Project not found:', id);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    console.log('✅ GET /api/admin/projects/[id] - Project found:', project.title);
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
      console.log('❌ PUT /api/admin/projects/[id] - Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role to determine which client to use
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('🔍 PUT /api/admin/projects/[id] - User role:', profile?.role, 'for project:', id);

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    console.log('✏️ PUT /api/admin/projects/[id] - Updating project:', id, 'with data:', Object.keys(body));

    // Role-based client selection
    const clientToUse = profile?.role === 'admin' ? 'admin' : 'regular';
    console.log('🎯 PUT /api/admin/projects/[id] - Using client type:', clientToUse);
    
    const project = await projectService.updateProject(id, body, clientToUse);
    console.log('✅ PUT /api/admin/projects/[id] - Project updated successfully:', project.title);
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
      console.log('❌ DELETE /api/admin/projects/[id] - Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role to determine which client to use
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('🔍 DELETE /api/admin/projects/[id] - User role:', profile?.role, 'for project:', id);

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Role-based client selection
    const clientToUse = profile?.role === 'admin' ? 'admin' : 'regular';
    console.log('🎯 DELETE /api/admin/projects/[id] - Using client type:', clientToUse);

    console.log('🗑️ DELETE /api/admin/projects/[id] - Deleting project:', id);
    await projectService.deleteProject(id, clientToUse);
    
    console.log('✅ DELETE /api/admin/projects/[id] - Project deleted successfully:', id);
    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('❌ DELETE /api/admin/projects/[id] - Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
