import { NextRequest, NextResponse } from 'next/server';
import { moduleService } from '@/services/moduleService';
import { createClient } from '@/lib/supabase/server';
import { activityLogService } from '@/services/activityLogService';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const module = await moduleService.getModuleById(params.id);
    
    if (!module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    return NextResponse.json(module);
  } catch (error) {
    console.error('Error fetching module:', error);
    return NextResponse.json(
      { error: 'Failed to fetch module' },
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

    const updateData = {
      ...(course_id && { course_id }),
      ...(title && { title }),
      ...(description && { description }),
      ...(position !== undefined && { position }),
      ...(metadata && { metadata })
    };

    const updatedModule = await moduleService.updateModule(params.id, updateData);
    
    // Log the action
    await activityLogService.logActivity({
      action: 'UPDATE',
      resource_type: 'modules',
      resource_id: params.id,
      details: `Updated module: ${updatedModule.title}`
    });

    return NextResponse.json(updatedModule);
  } catch (error) {
    console.error('Error updating module:', error);
    return NextResponse.json(
      { error: 'Failed to update module' },
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

    // Get module details before deletion for logging
    const module = await moduleService.getModuleById(params.id);
    
    if (!module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    await moduleService.deleteModule(params.id);
    
    // Log the action
    await activityLogService.logActivity({
      action: 'DELETE',
      resource_type: 'modules',
      resource_id: params.id,
      details: `Deleted module: ${module.title}`
    });

    return NextResponse.json({ message: 'Module deleted successfully' });
  } catch (error) {
    console.error('Error deleting module:', error);
    
    // Check if it's our custom error about lessons
    if (error instanceof Error && error.message.includes('Cannot delete module')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete module' },
      { status: 500 }
    );
  }
}