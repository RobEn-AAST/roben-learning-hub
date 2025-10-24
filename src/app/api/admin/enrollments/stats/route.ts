import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/enrollments/stats
 * Fetch enrollment statistics
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Total enrollments
    const { count: totalCount, error: totalError } = await supabase
      .from('course_enrollments')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      console.error('❌ Error fetching total enrollments:', totalError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch enrollment stats', 
          details: totalError.message
        },
        { status: 500 }
      );
    }

    // Student enrollments
    const { count: studentCount, error: studentError } = await supabase
      .from('course_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student');

    if (studentError) {
      console.error('❌ Error fetching student enrollments:', studentError);
    }

    // Instructor enrollments
    const { count: instructorCount, error: instructorError } = await supabase
      .from('course_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'instructor');

    if (instructorError) {
      console.error('❌ Error fetching instructor enrollments:', instructorError);
    }

    // Monthly enrollments (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: monthlyCount, error: monthlyError } = await supabase
      .from('course_enrollments')
      .select('*', { count: 'exact', head: true })
      .gte('enrolled_at', thirtyDaysAgo.toISOString());

    if (monthlyError) {
      console.error('❌ Error fetching monthly enrollments:', monthlyError);
    }

    return NextResponse.json({
      total: totalCount || 0,
      students: studentCount || 0,
      instructors: instructorCount || 0,
      monthly: monthlyCount || 0
    });

  } catch (error) {
    console.error('❌ Unexpected error in GET /api/admin/enrollments/stats:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
