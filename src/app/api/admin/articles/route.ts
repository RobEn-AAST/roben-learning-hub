import { NextRequest, NextResponse } from 'next/server';
import { articleService, ArticleService } from '@/services/articleService';
import { createClient } from '@/lib/supabase/server';
import { activityLogService } from '@/services/activityLogService';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ GET /api/admin/articles - Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role to determine which client to use
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('🔍 GET /api/admin/articles - User role:', profile?.role);

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Role-based client selection
    const clientToUse = profile?.role === 'admin' ? 'admin' : 'regular';
    console.log('🎯 GET /api/admin/articles - Using client type:', clientToUse);

    const articles = await articleService.getAllArticles(clientToUse);
    console.log('✅ GET /api/admin/articles - Successfully fetched', articles?.length || 0, 'articles');
    return NextResponse.json(articles);
  } catch (error) {
    console.error('❌ GET /api/admin/articles - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ POST /api/admin/articles - Auth error:', authError);
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'You must be logged in to create articles'
      }, { status: 401 });
    }

    // Check user role to determine which client to use
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('🔍 POST /api/admin/articles - User role:', profile?.role);

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'You do not have permission to create articles'
      }, { status: 403 });
    }

    const body = await request.json();
    console.log('📝 POST /api/admin/articles - Request body:', JSON.stringify(body, null, 2));
    
    const { lesson_id, title, content, summary, reading_time_minutes, metadata } = body;

    // Validate required fields with detailed error messages
    const missingFields: string[] = [];
    if (!lesson_id) missingFields.push('lesson_id');
    if (!title) missingFields.push('title');
    if (!content) missingFields.push('content');

    if (missingFields.length > 0) {
      console.log('❌ POST /api/admin/articles - Missing required fields:', missingFields);
      return NextResponse.json(
        { 
          error: `Missing required fields: ${missingFields.join(', ')}`,
          message: `Please provide all required fields: ${missingFields.join(', ')}`,
          missingFields
        },
        { status: 400 }
      );
    }

    // Auto-calculate reading time if not provided
    const calculatedReadingTime = reading_time_minutes || ArticleService.estimateReadingTime(content);

    // Auto-generate summary if not provided
    const generatedSummary = summary || ArticleService.generateSummary(content);

    const articleData = {
      lesson_id,
      title,
      content,
      summary: generatedSummary,
      reading_time_minutes: calculatedReadingTime,
      metadata: metadata || {}
    };

    console.log('📝 POST /api/admin/articles - Article data:', { 
      ...articleData, 
      content: articleData.content.substring(0, 100) + '...' 
    });

    // Role-based client selection
    const clientToUse = profile?.role === 'admin' ? 'admin' : 'regular';
    console.log('🎯 POST /api/admin/articles - Using client type:', clientToUse);

    const newArticle = await articleService.createArticle(articleData, clientToUse);
    
    // Log the action
    try {
      await activityLogService.logActivity({
        action: 'CREATE',
        table_name: 'articles',
        record_id: newArticle.id,
        record_name: title,
        description: `Created article: ${title}`
      });
    } catch (logError) {
      console.warn('⚠️ POST /api/admin/articles - Failed to log activity:', logError);
      // Don't fail the request if logging fails
    }

    console.log('✅ POST /api/admin/articles - Article created successfully:', newArticle.id);
    return NextResponse.json(newArticle, { status: 201 });
  } catch (error) {
    console.error('❌ POST /api/admin/articles - Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        error: `Failed to create article: ${errorMessage}`,
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
