import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, checkAdminPermission } from '@/lib/adminHelpers';

// GET - Get course statistics with admin privileges
export async function GET() {
  try {
    const permissionError = await checkAdminPermission();
    if (permissionError) return permissionError;

    const adminClient = createAdminClient();

    // Ultra-fast approach: Get only what we need without full table scans
    const [
      { data: coursesData },
      { count: totalEnrollments },
      { count: totalModules },
      { count: totalLessons }
    ] = await Promise.all([
      // Only select status field to minimize data transfer
      adminClient
        .from('courses')
        .select('status'),
      
      // Use estimated counts for large tables (much faster than exact)
      adminClient
        .from('course_enrollments')
        .select('*', { count: 'estimated', head: true }),
      
      adminClient
        .from('modules')
        .select('*', { count: 'estimated', head: true }),
      
      adminClient
        .from('lessons')
        .select('*', { count: 'estimated', head: true })
    ]);

    // Process courses data efficiently
    const totalCourses = coursesData?.length || 0;
    let publishedCourses = 0;
    let draftCourses = 0;
    
    coursesData?.forEach(course => {
      if (course.status === 'published') publishedCourses++;
      else if (course.status === 'draft') draftCourses++;
    });

    const stats = {
      totalCourses,
      publishedCourses,
      draftCourses,
      totalEnrollments: totalEnrollments || 0,
      totalModules: totalModules || 0,
      totalLessons: totalLessons || 0,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error in course stats API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch course statistics' },
      { status: 500 }
    );
  }
}