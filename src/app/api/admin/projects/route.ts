import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { projectService } from '@/services/projectService';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ GET /api/admin/projects - Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role to determine which client to use
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('🔍 GET /api/admin/projects - User ID:', user.id);
    console.log('🔍 GET /api/admin/projects - User role:', profile?.role);

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Role-based client selection
    const clientToUse = profile?.role === 'admin' ? 'admin' : 'regular';
    console.log('🎯 GET /api/admin/projects - Using client type:', clientToUse);

    const projects = await projectService.getAllProjects(clientToUse);
    console.log('✅ GET /api/admin/projects - Successfully fetched', projects?.length || 0, 'projects');
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
      console.log('❌ POST /api/admin/projects - Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role to determine which client to use
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('🔍 POST /api/admin/projects - User role:', profile?.role);

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { lesson_id, title, description, submission_instructions, external_link } = body;

    console.log('📝 POST /api/admin/projects - Creating project:', { lesson_id, title: title?.substring(0, 50) + '...' });

    if (!lesson_id || !title || !description) {
      console.log('❌ POST /api/admin/projects - Missing required fields');
      return NextResponse.json(
        { error: 'lesson_id, title, and description are required' },
        { status: 400 }
      );
    }

    // Role-based client selection
    const clientToUse = profile?.role === 'admin' ? 'admin' : 'regular';
    console.log('🎯 POST /api/admin/projects - Using client type:', clientToUse);

    const project = await projectService.createProject({
      lesson_id,
      title,
      description,
      submission_instructions,
      external_link
    }, clientToUse);

    console.log('✅ POST /api/admin/projects - Project created successfully:', project.id);
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('❌ POST /api/admin/projects - Error:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
