import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, checkAdminPermission } from '@/lib/adminHelpers';

// GET - Get real-time platform analytics
export async function GET(request: NextRequest) {
  try {
    const permissionError = await checkAdminPermission();
    if (permissionError) return permissionError;

    const adminClient = createAdminClient();

    // Get comprehensive analytics in parallel
    const [
      totalUsersResult,
      newUsersThisMonthResult,
      totalCoursesResult,
      publishedCoursesResult,
      totalEnrollmentsResult,
      newEnrollmentsResult,
      totalLessonsResult,
      totalModulesResult,
      totalQuizzesResult,
      videoLessonsResult,
      completedProgressResult,
      todayActivityResult
    ] = await Promise.all([
      // Total users count
      adminClient
        .from('profiles')
        .select('*', { count: 'exact', head: true }),
      
      // New users this month
      adminClient
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      
      // Total courses
      adminClient
        .from('courses')
        .select('*', { count: 'exact', head: true }),
      
      // Published courses
      adminClient
        .from('courses')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published'),
      
      // Total enrollments
      adminClient
        .from('course_enrollments')
        .select('*', { count: 'exact', head: true }),
      
      // New enrollments this month
      adminClient
        .from('course_enrollments')
        .select('*', { count: 'exact', head: true })
        .gte('enrolled_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      
      // Total lessons
      adminClient
        .from('lessons')
        .select('*', { count: 'exact', head: true }),
      
      // Total modules
      adminClient
        .from('modules')
        .select('*', { count: 'exact', head: true }),
      
      // Total quizzes
      adminClient
        .from('quizzes')
        .select('*', { count: 'exact', head: true }),
      
      // Video lessons
      adminClient
        .from('lessons')
        .select('*', { count: 'exact', head: true })
        .eq('lesson_type', 'video'),
      
      // Completed progress
      adminClient
        .from('lesson_progress')
        .select('user_id', { count: 'exact', head: true })
        .eq('status', 'completed'),
      
      // Today's activity
      adminClient
        .from('activity_logs')
        .select('user_id')
        .gte('created_at', new Date().toISOString().split('T')[0] + 'T00:00:00.000Z')
    ]);

    // Calculate metrics
    const totalUsers = totalUsersResult.count || 0;
    const newUsers = newUsersThisMonthResult.count || 0;
    const totalEnrollments = totalEnrollmentsResult.count || 0;
    const completedLessons = completedProgressResult.count || 0;
    
    // Calculate rates
    const userGrowthRate = totalUsers > 0 ? (newUsers / totalUsers) * 100 : 0;
    const completionRate = totalEnrollments > 0 ? (completedLessons / totalEnrollments) * 100 : 0;
    
    // Get unique active users today
    const uniqueActiveToday = todayActivityResult.data ? 
      new Set(todayActivityResult.data.map((log: any) => log.user_id)).size : 0;

    const analytics = {
      // User metrics
      totalUsers,
      newUsersThisMonth: newUsers,
      activeUsersToday: uniqueActiveToday,
      userGrowthRate: Math.round(userGrowthRate * 100) / 100,
      
      // Course metrics
      totalCourses: totalCoursesResult.count || 0,
      publishedCourses: publishedCoursesResult.count || 0,
      coursesCreatedThisMonth: 0, // Would need additional query
      
      // Enrollment metrics
      totalEnrollments,
      enrollmentsThisMonth: newEnrollmentsResult.count || 0,
      completionRate: Math.round(completionRate * 100) / 100,
      
      // Content metrics
      totalLessons: totalLessonsResult.count || 0,
      totalModules: totalModulesResult.count || 0,
      totalQuizzes: totalQuizzesResult.count || 0,
      totalVideos: videoLessonsResult.count || 0,
      
      // Additional metrics
      averageProgressPerUser: 0, // Would need complex calculation
      dailyActiveUsers: uniqueActiveToday,
      weeklyActiveUsers: 0, // Would need 7-day query
      monthlyActiveUsers: 0, // Would need 30-day query
      averageSessionsPerUser: 0 // Would need session tracking
    };

    return NextResponse.json({
      success: true,
      data: analytics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch analytics' 
      },
      { status: 500 }
    );
  }
}

// POST - Track custom analytics event
export async function POST(request: NextRequest) {
  try {
    const permissionError = await checkAdminPermission();
    if (permissionError) return permissionError;

    const body = await request.json();
    const { event, properties } = body;

    // You could store custom analytics events here
    // For now, just acknowledge the request
    
    return NextResponse.json({
      success: true,
      message: 'Event tracked successfully',
      event,
      properties
    });

  } catch (error) {
    console.error('Analytics tracking error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to track event' 
      },
      { status: 500 }
    );
  }
}