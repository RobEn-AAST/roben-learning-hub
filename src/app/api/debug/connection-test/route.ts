import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    console.log('Testing Supabase connection...');
    
    // Test environment variables first
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;
    
    console.log('Environment check:', {
      url: supabaseUrl ? 'SET' : 'NOT SET',
      key: supabaseKey ? 'SET' : 'NOT SET',
      urlLength: supabaseUrl?.length || 0,
      keyLength: supabaseKey?.length || 0,
      actualUrl: supabaseUrl?.substring(0, 30) + '...',
      actualKey: supabaseKey?.substring(0, 30) + '...'
    });

    // Return early with environment info for debugging
    return NextResponse.json({
      success: supabaseUrl && supabaseKey ? true : false,
      environment: {
        url: supabaseUrl ? 'SET' : 'NOT SET',
        key: supabaseKey ? 'SET' : 'NOT SET',
        urlLength: supabaseUrl?.length || 0,
        keyLength: supabaseKey?.length || 0,
        nodeEnv: process.env.NODE_ENV,
        actualUrl: supabaseUrl?.substring(0, 50) + '...' || 'MISSING',
        actualKey: supabaseKey?.substring(0, 50) + '...' || 'MISSING'
      }
    });

    // Now test actual Supabase connection with improved timeout handling
    const supabase = await createClient();
    
    const startTime = Date.now();
    
    try {
      // Test a simple query with timeout
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      const duration = Date.now() - startTime;

      if (error) {
        console.error('Supabase query error:', error);
        return NextResponse.json({
          success: false,
          error: 'Supabase query failed',
          details: {
            code: error?.code || 'unknown',
            message: error?.message || 'no message',
            duration: duration
          }
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Supabase connection successful',
        duration: duration,
        timestamp: new Date().toISOString(),
        dataReceived: !!data
      });
      
    } catch (connectionError: any) {
      const duration = Date.now() - startTime;
      console.error('Supabase connection error:', connectionError);
      
      return NextResponse.json({
        success: false,
        error: 'Supabase connection failed',
        details: {
          message: connectionError.message,
          name: connectionError.name,
          duration: duration
        }
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Connection test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Connection test failed',
      details: {
        message: error.message,
        name: error.name,
        status: error.status
      }
    }, { status: 500 });
  }
}