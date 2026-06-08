import { NextRequest, NextResponse } from 'next/server';
import { articleService } from '@/services/articleService';
import { createClient } from '@/lib/supabase/server';
import { activityLogService } from '@/services/activityLogService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role to determine which client to use
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();


    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Role-based client selection
    const clientToUse = profile?.role === 'admin' ? 'admin' : 'regular';

    const article = await articleService.getArticleById(id, clientToUse);
    
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error('❌ GET /api/admin/articles/[id] - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch article' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role to determine which client to use
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();


    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const updateData = { ...body };


    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // Role-based client selection
    const clientToUse = profile?.role === 'admin' ? 'admin' : 'regular';

    const updatedArticle = await articleService.updateArticle(id, updateData, clientToUse);
    
    // Log the action
    await activityLogService.logActivity({
      action: 'UPDATE',
      table_name: 'articles',
      record_id: id,
      description: `Updated article: ${updatedArticle.title}`
    });

    return NextResponse.json(updatedArticle);
  } catch (error) {
    console.error('❌ PUT /api/admin/articles/[id] - Error:', error);
    return NextResponse.json(
      { error: 'Failed to update article' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role to determine which client to use
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();


    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Role-based client selection
    const clientToUse = profile?.role === 'admin' ? 'admin' : 'regular';

    // Get article info before deletion for logging
    const article = await articleService.getArticleById(id, clientToUse);
    
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    await articleService.deleteArticle(id, clientToUse);
    
    // Log the action
    await activityLogService.logActivity({
      action: 'DELETE',
      table_name: 'articles',
      record_id: id,
      description: `Deleted article: ${article.title}`
    });

    return NextResponse.json({ message: 'Article deleted successfully' });
  } catch (error) {
    console.error('❌ DELETE /api/admin/articles/[id] - Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete article' },
      { status: 500 }
    );
  }
}
