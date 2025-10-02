import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, checkAdminOrInstructorPermission } from '@/lib/adminHelpers';
import { createClient } from '@/lib/supabase/server';
import { activityLogService } from '@/services/activityLogService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[MODULES API GET BY ID] Request received');
    
    const permissionError = await checkAdminOrInstructorPermission();
    if (permissionError) {
      console.log('[MODULES API GET BY ID] Permission denied');
      return permissionError;
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { id } = await params;
    
    // Get user role to determine which client to use
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user!.id)
      .single();

    // Use admin client for admins, regular client for instructors (to respect RLS)
    const client = profile?.role === 'admin' ? adminClient : supabase;

    console.log('[MODULES API GET BY ID] Fetching module:', id, 'userRole:', profile?.role);

    const { data: module, error } = await client
      .from('modules')
      .select(`
        *,
        courses!inner(
          id,
          title,
          status
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('[MODULES API GET BY ID] Query error:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Module not found' }, { status: 404 });
      }
      throw new Error(`Failed to fetch module: ${error.message}`);
    }

    // Get lesson count
    const { count: lessonsCount } = await client
      .from('lessons')
      .select('id', { count: 'exact' })
      .eq('module_id', id);

    const result = {
      ...module,
      course: module.courses,
      lessons_count: lessonsCount || 0
    };

    console.log('[MODULES API GET BY ID] Success:', result.id);
    return NextResponse.json(result);
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[MODULES API PUT] Request received');
    
    const permissionError = await checkAdminOrInstructorPermission();
    if (permissionError) {
      console.log('[MODULES API PUT] Permission denied');
      return permissionError;
    }

    const adminClient = createAdminClient();
    const { id } = await params;

    const body = await request.json();
    const { course_id, title, description, position, metadata } = body;

    console.log('[MODULES API PUT] Body received:', { course_id, title, description, position });

    const updateData = {
      ...(course_id && { course_id }),
      ...(title && { title }),
      ...(description && { description }),
      ...(position !== undefined && { position }),
      ...(metadata && { metadata }),
      updated_at: new Date().toISOString()
    };

    // Update module using admin client
    const { data: updatedModule, error } = await adminClient
      .from('modules')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        courses!inner(
          id,
          title,
          status
        )
      `)
      .single();

    if (error) {
      console.error('[MODULES API PUT] Update error:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Module not found' }, { status: 404 });
      }
      throw new Error(`Failed to update module: ${error.message}`);
    }

    console.log('[MODULES API PUT] Module updated successfully:', updatedModule.id);
    
    // Log the action
    await activityLogService.logActivity({
      action: 'UPDATE',
      resource_type: 'modules',
      resource_id: id,
      details: `Updated module: ${updatedModule.title}`
    });

    // Get lesson count
    const { count: lessonsCount } = await adminClient
      .from('lessons')
      .select('id', { count: 'exact' })
      .eq('module_id', id);

    const result = {
      ...updatedModule,
      course: updatedModule.courses,
      lessons_count: lessonsCount || 0
    };

    return NextResponse.json(result);
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[MODULES API DELETE] Request received');
    
    const permissionError = await checkAdminOrInstructorPermission();
    if (permissionError) {
      console.log('[MODULES API DELETE] Permission denied');
      return permissionError;
    }

    const adminClient = createAdminClient();
    const { id } = await params;

    // Get module details before deletion for logging
    console.log('[MODULES API DELETE] Deleting module:', id);

    // First get the module to log its title
    const { data: module, error: fetchError } = await adminClient
      .from('modules')
      .select('id, title')
      .eq('id', id)
      .single();

    if (fetchError || !module) {
      console.error('[MODULES API DELETE] Module not found:', fetchError);
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    // Delete the module
    const { error: deleteError } = await adminClient
      .from('modules')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[MODULES API DELETE] Delete error:', deleteError);
      throw new Error(`Failed to delete module: ${deleteError.message}`);
    }

    console.log('[MODULES API DELETE] Module deleted successfully:', id);
    
    // Log the action
    await activityLogService.logActivity({
      action: 'DELETE',
      resource_type: 'modules',
      resource_id: id,
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