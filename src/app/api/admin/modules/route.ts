import { NextRequest, NextResponse } from 'next/server';
import { moduleService } from '@/services/moduleService';
import { createClient } from '@/lib/supabase/server';
import { activityLogService } from '@/services/activityLogService';

export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const courseId = searchParams.get('course_id');
    const search = searchParams.get('search');

    const filters = {
      ...(courseId && { course_id: courseId }),
      ...(search && { search: search })
    };

    const result = await moduleService.getModules(page, limit, filters);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching modules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch modules' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const { course_id, title, description, position, metadata } = body;

    // Validate required fields
    if (!course_id || !title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: course_id, title, description' },
        { status: 400 }
      );
    }

    const moduleData = {
      course_id,
      title,
      description,
      position,
      metadata: metadata || {}
    };

    const newModule = await moduleService.createModule(moduleData);
    
    // Log the action
    await activityLogService.logActivity({
      action: 'CREATE',
      resource_type: 'modules',
      resource_id: newModule.id,
      details: `Created module: ${title}`
    });

    return NextResponse.json(newModule, { status: 201 });
  } catch (error) {
    console.error('Error creating module:', error);
    return NextResponse.json(
      { error: 'Failed to create module' },
      { status: 500 }
    );
  }
}