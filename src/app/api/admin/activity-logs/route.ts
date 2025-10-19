import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Get activity logs - Admin only
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const supabaseAdmin = createServiceClient(supabaseUrl, serviceRoleKey);
    
    // Check authentication and admin role
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const action = searchParams.get('action');
    const resourceType = searchParams.get('resource_type');
    const userId = searchParams.get('user_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Simple query with the new table structure
    let query = supabaseAdmin
      .from('activity_logs')
      .select(`
        id,
        user_name,
        action,
        table_name,
        record_name,
        description,
        created_at
      `)
      .order('created_at', { ascending: false });

    // Apply filters with new column names
    if (action) query = query.eq('action', action);
    if (resourceType) query = query.eq('table_name', resourceType);
    if (userId) query = query.eq('user_id', userId);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Use service role client to bypass RLS
    const { data: logs, error: logsError, count } = await query;

    if (logsError) {
      return NextResponse.json({ 
        error: 'Failed to fetch logs', 
        details: logsError.message,
        code: logsError.code 
      }, { status: 500 });
    }

    // Get summary statistics
    const { data: stats } = await supabaseAdmin
      .from('activity_logs')
      .select('action', { count: 'exact' })
      .limit(0);

    return NextResponse.json({
      logs: logs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      stats: {
        totalLogs: count || 0
      }
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Create activity log - Used by system
export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = createServiceClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();
    
    const {
      user_id,
      user_name,
      action,
      table_name,
      record_id,
      record_name,
      description,
      old_values,
      new_values
    } = body;

    // Validate required fields
    if (!user_id || !user_name || !action || !table_name || !description) {
      return NextResponse.json({ 
        error: 'Missing required fields: user_id, user_name, action, table_name, description' 
      }, { status: 400 });
    }

    const { data: log, error: logError } = await supabaseAdmin
      .from('activity_logs')
      .insert({
        user_id,
        user_name,
        action: action.toUpperCase(),
        table_name,
        record_id,
        record_name,
        description,
        old_values,
        new_values
      })
      .select()
      .single();

    if (logError) {
      return NextResponse.json({ error: 'Failed to create log' }, { status: 500 });
    }

    return NextResponse.json({ log });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}