import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const supabaseAdmin = createServiceClient(supabaseUrl, serviceRoleKey);
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // First, let's see how many progress records exist
    const { data: existingProgress, error: countError } = await supabaseAdmin
      .from('lesson_progress')
      .select('id')
      .eq('user_id', user.id);

    if (countError) {
      console.error('Error counting progress:', countError);
      return NextResponse.json({ error: 'Failed to count progress records' }, { status: 500 });
    }

    const totalRecords = existingProgress?.length || 0;

    if (totalRecords === 0) {
      return NextResponse.json({
        success: true,
        message: 'No progress records found to delete',
        deletedCount: 0
      });
    }

    // Delete all progress records for this user
    const { error: deleteError, count } = await supabaseAdmin
      .from('lesson_progress')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting progress:', deleteError);
      return NextResponse.json({ 
        error: 'Failed to delete progress records',
        details: deleteError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully cleared all progress data`,
      deletedCount: totalRecords,
      user: {
        id: user.id,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Clear progress error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}