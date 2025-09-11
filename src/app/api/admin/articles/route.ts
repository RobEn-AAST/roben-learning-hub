import { NextRequest, NextResponse } from 'next/server';
import { articleService, ArticleService } from '@/services/articleService';
import { createClient } from '@/lib/supabase/server';
import { activityLogService } from '@/services/activityLogService';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const articles = await articleService.getAllArticles();
    return NextResponse.json(articles);
  } catch (error) {
    console.error('Error fetching articles:', error);
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { lesson_id, title, content, summary, reading_time_minutes, metadata } = body;

    // Validate required fields
    if (!lesson_id || !title || !content) {
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

    const newArticle = await articleService.createArticle(articleData);
    
    // Log the action
    await activityLogService.logActivity({
      action: 'CREATE',
      resource_type: 'articles',
      resource_id: newArticle.id,
      details: `Created article: ${title}`
    });

    return NextResponse.json(newArticle, { status: 201 });
  } catch (error) {
    console.error('Error creating article:', error);
    return NextResponse.json(
      { error: 'Failed to create article' },
      { status: 500 }
    );
  }
}
