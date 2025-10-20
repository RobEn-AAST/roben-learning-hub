import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, checkAdminPermission } from '@/lib/adminHelpers';

// GET - Get Supabase database performance metrics
export async function GET(request: NextRequest) {
  try {
    const permissionError = await checkAdminPermission();
    if (permissionError) return permissionError;

    const adminClient = createAdminClient();

    // Get table sizes and basic performance metrics
    const tables = [
      'profiles', 
      'courses', 
      'modules', 
      'lessons', 
      'course_enrollments', 
      'lesson_progress',
      'activity_logs',
      'quizzes',
      'questions',
      'question_options'
    ];

    const tableMetrics: Record<string, any> = {};
    
    // Get count for each table
    for (const table of tables) {
      try {
        const { count, error } = await adminClient
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          tableMetrics[table] = {
            count: count || 0,
            tableName: table
          };
        }
      } catch (tableError) {
        console.warn(`Could not get metrics for table ${table}:`, tableError);
        tableMetrics[table] = {
          count: 0,
          tableName: table,
          error: 'Access denied or table not found'
        };
      }
    }

    // Get recent database activity
    const recentActivity = await adminClient
      .from('activity_logs')
      .select('action, table_name, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    // Analyze activity patterns
    const activityByTable: Record<string, number> = {};
    const activityByHour = Array(24).fill(0);
    
    if (recentActivity.data) {
      recentActivity.data.forEach((log: any) => {
        // Count by table
        if (!activityByTable[log.table_name]) {
          activityByTable[log.table_name] = 0;
        }
        activityByTable[log.table_name]++;
        
        // Count by hour
        const hour = new Date(log.created_at).getHours();
        activityByHour[hour]++;
      });
    }

    // Calculate database health score (simple algorithm)
    const totalRecords = Object.values(tableMetrics).reduce((sum: number, table: any) => sum + (table.count || 0), 0);
    const tablesWithData = Object.values(tableMetrics).filter((table: any) => (table.count || 0) > 0).length;
    const healthScore = Math.min(100, (tablesWithData / tables.length) * 80 + (totalRecords > 1000 ? 20 : (totalRecords / 1000) * 20));

    // Performance insights
    const insights = [];
    
    if (tableMetrics.activity_logs?.count > 10000) {
      insights.push({
        type: 'info',
        message: `Activity logs table has ${tableMetrics.activity_logs.count} records. Consider archiving old logs for better performance.`
      });
    }
    
    if (tableMetrics.lesson_progress?.count > tableMetrics.course_enrollments?.count * 2) {
      insights.push({
        type: 'success',
        message: 'High lesson completion activity detected. Users are actively engaging with content!'
      });
    }
    
    if (tableMetrics.courses?.count > 0 && tableMetrics.course_enrollments?.count === 0) {
      insights.push({
        type: 'warning',
        message: 'You have courses but no enrollments. Consider marketing your courses or adjusting pricing.'
      });
    }

    // Storage estimation (rough calculation)
    const estimatedStorageKB = totalRecords * 2; // Very rough estimate: 2KB per record average
    const storageUnit = estimatedStorageKB > 1024 ? 
      (estimatedStorageKB > 1024 * 1024 ? 'GB' : 'MB') : 'KB';
    const storageValue = estimatedStorageKB > 1024 * 1024 ? 
      (estimatedStorageKB / (1024 * 1024)).toFixed(2) :
      estimatedStorageKB > 1024 ? 
        (estimatedStorageKB / 1024).toFixed(2) : 
        estimatedStorageKB.toFixed(0);

    return NextResponse.json({
      success: true,
      data: {
        databaseHealth: {
          score: Math.round(healthScore),
          totalRecords,
          totalTables: tables.length,
          tablesWithData,
          estimatedStorage: `${storageValue} ${storageUnit}`
        },
        tableMetrics,
        activityPatterns: {
          byTable: activityByTable,
          byHour: activityByHour.map((count, hour) => ({ hour, count }))
        },
        insights,
        supabaseInfo: {
          region: 'Auto-detected from connection',
          plan: 'Check your Supabase dashboard for plan details',
          note: 'For detailed Supabase analytics, visit your Supabase project dashboard'
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Supabase metrics API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch Supabase metrics' 
      },
      { status: 500 }
    );
  }
}