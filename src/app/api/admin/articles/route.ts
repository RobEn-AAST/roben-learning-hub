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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role to determine which client to use
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('🔍 POST /api/admin/articles - User role:', profile?.role);

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { lesson_id, title, content, summary, reading_time_minutes, metadata } = body;

    console.log('📝 POST /api/admin/articles - Creating article:', { lesson_id, title: title?.substring(0, 50) + '...' });

    // Validate required fields
    if (!lesson_id || !title || !content) {
      console.log('❌ POST /api/admin/articles - Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: lesson_id, title, content' },
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

    // Role-based client selection
    const clientToUse = profile?.role === 'admin' ? 'admin' : 'regular';
    console.log('🎯 POST /api/admin/articles - Using client type:', clientToUse);

    const newArticle = await articleService.createArticle(articleData, clientToUse);
    
    // Log the action
    await activityLogService.logActivity({
      action: 'CREATE',
      resource_type: 'articles',
      resource_id: newArticle.id,
      details: `Created article: ${title}`
    });

    console.log('✅ POST /api/admin/articles - Article created successfully:', newArticle.id);
    return NextResponse.json(newArticle, { status: 201 });
  } catch (error) {
    console.error('❌ POST /api/admin/articles - Error:', error);
    return NextResponse.json(
      { error: 'Failed to create article' },
      { status: 500 }
    );
  }
}
