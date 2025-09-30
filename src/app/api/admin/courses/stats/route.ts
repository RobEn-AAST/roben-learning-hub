import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, checkAdminPermission } from '@/lib/adminHelpers';

// GET - Get course statistics with admin privileges
export async function GET() {
  try {
    const permissionError = await checkAdminPermission();
    if (permissionError) return permissionError;

    const adminClient = createAdminClient();

    // Get all course statistics using admin client (bypasses RLS)
    const [
      { count: totalCourses },
      { count: publishedCourses },
      { count: draftCourses },
      { count: totalEnrollments },
      { count: totalModules },
      { count: totalLessons }
    ] = await Promise.all([
      adminClient.from('courses').select('*', { count: 'exact', head: true }),
      adminClient.from('courses').select('*', { count: 'exact', head: true }).eq('status', 'published'),
      adminClient.from('courses').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
      adminClient.from('course_enrollments').select('*', { count: 'exact', head: true }),
      adminClient.from('modules').select('*', { count: 'exact', head: true }),
      adminClient.from('lessons').select('*', { count: 'exact', head: true })
    ]);

    const stats = {
      totalCourses: totalCourses || 0,
      publishedCourses: publishedCourses || 0,
      draftCourses: draftCourses || 0,
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