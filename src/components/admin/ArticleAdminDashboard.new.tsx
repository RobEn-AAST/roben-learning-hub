'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { articleService, Article, ArticleStats, Lesson, CreateArticleData, UpdateArticleData } from '@/services/articleService';
import { activityLogService } from '@/services/activityLogService';

// Icons
const Icons = {
  Edit: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  Delete: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  View: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  Plus: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Article: () => (
    <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Save: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  ),
  Cancel: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Clock: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
};

type ViewMode = 'list' | 'create' | 'edit' | 'view';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}

function StatsCard({ title, value, icon, color }: StatsCardProps) {
  return (
    <Card className="bg-white">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-black">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ArticleAdminDashboard() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [stats, setStats] = useState<ArticleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<string>('');

  useEffect(() => {
    loadData();
    // Log dashboard access
    activityLogService.logActivity({
      action: 'VIEW',
      table_name: 'articles',
      description: 'Accessed article management dashboard'
    });
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [articlesData, lessonsData, statsData] = await Promise.all([
        fetch('/api/admin/articles').then(res => res.json()),
        fetch('/api/admin/articles/lessons').then(res => res.json()),
        fetch('/api/admin/articles/stats').then(res => res.json())
      ]);

      setArticles(articlesData);
      setLessons(lessonsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (article: Article) => {
    setSelectedArticle(article);
    setViewMode('edit');
  };

  const handleView = (article: Article) => {
    setSelectedArticle(article);
    setViewMode('view');
  };

  const handleDelete = async (article: Article) => {
    if (!confirm(`Are you sure you want to delete "${article.title}"?`)) return;

    try {
      const response = await fetch(`/api/admin/articles/${article.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete article');

      await loadData();
      alert('Article deleted successfully!');
    } catch (error) {
      console.error('Error deleting article:', error);
      alert('Failed to delete article. Please try again.');
    }
  };

  const handleCreateNew = () => {
    setSelectedArticle(null);
    setViewMode('create');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedArticle(null);
    loadData(); // Refresh data
  };

  const handleSaveArticle = async (articleData: CreateArticleData | UpdateArticleData) => {
    try {
      setLoading(true);
      
      if (selectedArticle) {
        // Update existing article
        const response = await fetch(`/api/admin/articles/${selectedArticle.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(articleData)
        });

        if (!response.ok) throw new Error('Failed to update article');
        alert('Article updated successfully!');
      } else {
        // Create new article
        const response = await fetch('/api/admin/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(articleData)
        });

        if (!response.ok) throw new Error('Failed to create article');
        alert('Article created successfully!');
      }
      
      handleBackToList();
    } catch (error) {
      alert('Failed to save article: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.lesson_title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLesson = !selectedLesson || article.lesson_id === selectedLesson;
    return matchesSearch && matchesLesson;
  });

  // Create/Edit Form View
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-black">
            {viewMode === 'create' ? 'Create New Article' : 'Edit Article'}
          </h1>
          <Button onClick={handleBackToList} variant="outline">
            ← Back to List
          </Button>
        </div>
        
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-black flex items-center gap-2">
              {viewMode === 'create' ? 'Create Article' : 'Edit Article'}
              <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
            </CardTitle>
            <CardDescription className="text-gray-600">
              {viewMode === 'create' ? 'Add a new article to the learning platform' : 'Update article information'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              Form functionality coming soon
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // View Details
  if (viewMode === 'view' && selectedArticle) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-black">Article Details</h1>
          <Button onClick={handleBackToList} variant="outline">
            ← Back to List
          </Button>
        </div>
        
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-black">{selectedArticle.title}</CardTitle>
            <CardDescription className="text-gray-600">{selectedArticle.summary}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-black">Reading Time</h3>
                <p className="text-gray-600">{selectedArticle.reading_time_minutes} minutes</p>
              </div>
              <div>
                <h3 className="font-medium text-black">Content</h3>
                <div className="text-gray-600 mt-1 prose max-w-none">
                  {selectedArticle.content}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-lg text-black">Loading articles...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-black">Articles Dashboard</h1>
          <p className="text-gray-600">Manage your written content and articles</p>
        </div>
        <Button onClick={handleCreateNew} className="flex items-center space-x-2">
          <Icons.Plus />
          <span>Create Article</span>
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Articles"
            value={stats.total_articles}
            icon={<Icons.Article />}
            color="bg-blue-100"
          />
          <StatsCard
            title="Total Duration"
            value={`${stats.total_reading_time_hours}h`}
            icon={<Icons.Clock />}
            color="bg-green-100"
          />
          <StatsCard
            title="With Summary"
            value={stats.articles_with_summary}
            icon={<Icons.Article />}
            color="bg-purple-100"
          />
          <StatsCard
            title="Average Length"
            value={`${Math.round(stats.average_reading_time)}min`}
            icon={<Icons.Clock />}
            color="bg-orange-100"
          />
        </div>
      )}

      {/* Search and Filters */}
      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Input
                placeholder="Search articles by title, content, or lesson..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white text-black"
              />
            </div>
            <div className="flex space-x-2">
              <select
                value={selectedLesson}
                onChange={(e) => setSelectedLesson(e.target.value)}
                className="p-2 border border-gray-300 rounded bg-white text-black"
              >
                <option value="">All Lessons</option>
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.course_title} → {lesson.module_title} → {lesson.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Articles Table */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-black flex items-center gap-2">
            Articles Management
            <Badge variant="secondary" className="text-xs">Read Only</Badge>
          </CardTitle>
          <CardDescription className="text-gray-600">Manage all your articles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium text-black">Title</th>
                  <th className="text-left p-4 font-medium text-black">Lesson</th>
                  <th className="text-left p-4 font-medium text-black">Duration</th>
                  <th className="text-left p-4 font-medium text-black">Created</th>
                  <th className="text-left p-4 font-medium text-black">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredArticles.map((article) => (
                  <tr key={article.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div>
                        <div className="font-medium text-black">{article.title}</div>
                        {article.summary && (
                          <div className="text-sm text-gray-600 truncate max-w-xs">
                            {article.summary}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        <div className="font-medium text-black">{article.lesson_title}</div>
                        <div className="text-gray-600">{article.course_title}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center text-sm text-black">
                        <Icons.Clock />
                        <span className="ml-1">{article.reading_time_minutes}min</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-black">{new Date(article.created_at).toLocaleDateString()}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(article)}
                          className="flex items-center space-x-1"
                        >
                          <Icons.View />
                          <span>View</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(article)}
                          className="flex items-center space-x-1"
                        >
                          <Icons.Edit />
                          <span>Edit</span>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(article)}
                          className="flex items-center space-x-1"
                        >
                          <Icons.Delete />
                          <span>Delete</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredArticles.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No articles found. Create your first article to get started!
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
