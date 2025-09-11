import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { projectService } from '@/services/projectService';

async function checkAdminPermission() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return null;
}

export async function GET() {
  try {
    const permissionError = await checkAdminPermission();
    if (permissionError) return permissionError;

    const projects = await projectService.getAllProjects();
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const permissionError = await checkAdminPermission();
    if (permissionError) return permissionError;

    const body = await request.json();
    const { lesson_id, title, description, submission_instructions, external_link } = body;

    if (!lesson_id || !title || !description) {
      return NextResponse.json(
        { error: 'lesson_id, title, and description are required' },
        { status: 400 }
      );
    }

    const project = await projectService.createProject({
      lesson_id,
      title,
      description,
      submission_instructions,
      external_link
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
