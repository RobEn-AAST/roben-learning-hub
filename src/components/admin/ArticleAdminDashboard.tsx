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
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  ),
  Clock: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Book: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  Search: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
};

interface FormData {
  lesson_id: string;
  title: string;
  content: string;
  summary: string;
  reading_time_minutes: number;
  metadata: Record<string, any>;
}

export default function ArticleAdminDashboard() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [stats, setStats] = useState<ArticleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<string>('');

  const [formData, setFormData] = useState<FormData>({
    lesson_id: '',
    title: '',
    content: '',
    summary: '',
    reading_time_minutes: 5,
    metadata: {}
  });

  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  useEffect(() => {
    loadData();
    // Log dashboard access
    activityLogService.logActivity({
      action: 'VIEW',
      resource_type: 'articles',
      details: 'Accessed article management dashboard'
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

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    }

    if (!formData.content.trim()) {
      errors.content = 'Content is required';
    }

    if (!formData.lesson_id) {
      errors.lesson_id = 'Lesson is required';
    }

    if (formData.reading_time_minutes <= 0) {
      errors.reading_time_minutes = 'Reading time must be positive';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const articleData: CreateArticleData = {
        lesson_id: formData.lesson_id,
        title: formData.title,
        content: formData.content,
        summary: formData.summary,
        reading_time_minutes: formData.reading_time_minutes,
        metadata: formData.metadata
      };

      if (editingArticle) {
        // Update existing article
        const response = await fetch(`/api/admin/articles/${editingArticle.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(articleData)
        });

        if (!response.ok) throw new Error('Failed to update article');
      } else {
        // Create new article
        const response = await fetch('/api/admin/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(articleData)
        });

        if (!response.ok) throw new Error('Failed to create article');
      }

      // Reset form and reload data
      setFormData({
        lesson_id: '',
        title: '',
        content: '',
        summary: '',
        reading_time_minutes: 5,
        metadata: {}
      });
      setIsCreating(false);
      setEditingArticle(null);
      setFormErrors({});
      await loadData();
    } catch (error) {
      console.error('Error saving article:', error);
      alert('Failed to save article. Please try again.');
    }
  };

  const handleEdit = (article: Article) => {
    setEditingArticle(article);
    setFormData({
      lesson_id: article.lesson_id,
      title: article.title,
      content: article.content,
      summary: article.summary || '',
      reading_time_minutes: article.reading_time_minutes,
      metadata: article.metadata || {}
    });
    setIsCreating(true);
  };

  const handleDelete = async (article: Article) => {
    if (!confirm(`Are you sure you want to delete "${article.title}"?`)) return;

    try {
      const response = await fetch(`/api/admin/articles/${article.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete article');

      await loadData();
    } catch (error) {
      console.error('Error deleting article:', error);
      alert('Failed to delete article. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setIsCreating(false);
    setEditingArticle(null);
    setFormData({
      lesson_id: '',
      title: '',
      content: '',
      summary: '',
      reading_time_minutes: 5,
      metadata: {}
    });
    setFormErrors({});
  };

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.lesson_title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLesson = !selectedLesson || article.lesson_id === selectedLesson;
    return matchesSearch && matchesLesson;
  });

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-black">Loading article management...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-black">Article Management</h1>
            <p className="text-gray-600 mt-2">Manage written content and articles for lessons</p>
          </div>
          <Button 
            onClick={() => setIsCreating(!isCreating)}
            className="flex items-center space-x-2"
          >
            <Icons.Plus />
            <span>{isCreating ? 'Cancel' : 'Add Article'}</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="border-2 border-black shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 mr-4">
                  <Icons.Article />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Articles</p>
                  <h3 className="text-2xl font-bold text-black">{stats.total_articles}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-2 border-black shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 mr-4">
                  <Icons.Clock />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Duration</p>
                  <h3 className="text-2xl font-bold text-black">{stats.total_reading_time_hours}h</h3>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-2 border-black shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 mr-4">
                  <Icons.Book />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">With Summary</p>
                  <h3 className="text-2xl font-bold text-black">{stats.articles_with_summary}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-2 border-black shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-orange-100 mr-4">
                  <Icons.Clock />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Reading Time</p>
                  <h3 className="text-2xl font-bold text-black">{stats.average_reading_time}min</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create/Edit Form */}
      {isCreating && (
        <Card className="border-2 border-black shadow-lg bg-white mb-8">
          <CardHeader className="border-b-2 border-black">
            <CardTitle className="flex items-center space-x-2 text-black">
              <Icons.Article />
              <span>{editingArticle ? 'Edit Article' : 'Create New Article'}</span>
            </CardTitle>
            <CardDescription className="text-gray-600">
              {editingArticle ? 'Update the article information below' : 'Fill in the details to create a new article'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="border-2 border-black rounded-lg p-4">
                  <Label htmlFor="lesson_id" className="text-black font-medium">Lesson *</Label>
                  <select
                    id="lesson_id"
                    value={formData.lesson_id}
                    onChange={(e) => setFormData({ ...formData, lesson_id: e.target.value })}
                    className="w-full mt-2 p-3 border-2 border-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
                    required
                  >
                    <option value="">Select a lesson</option>
                    {lessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        {lesson.course_title} → {lesson.module_title} → {lesson.title}
                      </option>
                    ))}
                  </select>
                  {formErrors.lesson_id && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.lesson_id}</p>
                  )}
                </div>

                <div className="border-2 border-black rounded-lg p-4">
                  <Label htmlFor="reading_time_minutes" className="text-black font-medium">Reading Time (minutes) *</Label>
                  <Input
                    id="reading_time_minutes"
                    type="number"
                    min="1"
                    value={formData.reading_time_minutes}
                    onChange={(e) => setFormData({ ...formData, reading_time_minutes: parseInt(e.target.value) || 0 })}
                    placeholder="Estimated reading time"
                    className="mt-2 p-3 border-2 border-black bg-white text-black"
                    required
                  />
                  {formErrors.reading_time_minutes && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.reading_time_minutes}</p>
                  )}
                </div>
              </div>

              <div className="border-2 border-black rounded-lg p-4">
                <Label htmlFor="title" className="text-black font-medium">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Article title"
                  className="mt-2 p-3 border-2 border-black bg-white text-black"
                  required
                />
                {formErrors.title && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.title}</p>
                )}
              </div>

              <div className="border-2 border-black rounded-lg p-4">
                <Label htmlFor="summary" className="text-black font-medium">Summary</Label>
                <textarea
                  id="summary"
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Brief summary of the article (optional - will be auto-generated if empty)"
                  className="w-full mt-2 p-3 border-2 border-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
                  rows={3}
                />
              </div>

              <div className="border-2 border-black rounded-lg p-4">
                <Label htmlFor="content" className="text-black font-medium">Content *</Label>
                <textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Article content (supports HTML)"
                  className="w-full mt-2 p-3 border-2 border-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
                  rows={12}
                  required
                />
                {formErrors.content && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.content}</p>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t-2 border-black">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCancelEdit} 
                  className="px-6 py-3 text-black border-2 border-black hover:bg-black hover:text-white transition-colors duration-200"
                >
                  <Icons.Cancel />
                  <span color='white' className="ml-2">Cancel</span>
                </Button>
                <Button 
                  type="submit" 
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-600 hover:border-blue-700"
                >
                  <Icons.Save />
                  <span className="ml-2">{editingArticle ? 'Update' : 'Create'} Article</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Articles Management Section */}
      <Card className="border-2 border-black shadow-lg bg-white">
        <CardHeader className="border-b-2 border-black">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-black">Articles Management</CardTitle>
              <CardDescription className="text-gray-600">Manage all your articles and their content</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative border-2 border-black rounded-lg">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Icons.Search />
                </div>
                <Input
                  placeholder="Search articles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64 bg-white text-black border-none"
                />
              </div>
              <select
                value={selectedLesson}
                onChange={(e) => setSelectedLesson(e.target.value)}
                className="p-3 border-2 border-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
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
        </CardHeader>

        <CardContent className="p-0">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 p-6 border-b-2 border-black bg-gray-50 text-sm font-medium text-gray-600">
            <div className="col-span-4">Article Details</div>
            <div className="col-span-3">Lesson</div>
            <div className="col-span-2">Duration</div>
            <div className="col-span-2">Created</div>
            <div className="col-span-1">Actions</div>
          </div>

          {/* Articles List */}
          <div className="divide-y-2 divide-black">
            {filteredArticles.length === 0 ? (
              <div className="p-12 text-center border-2 border-black m-4 rounded-lg">
                <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-full bg-gray-100">
                    <Icons.Article />
                  </div>
                </div>
                <h3 className="text-lg font-medium text-black mb-2">No articles found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || selectedLesson ? 'Try adjusting your filters' : 'Create your first article to get started!'}
                </p>
              </div>
            ) : (
              filteredArticles.map((article) => (
                <div key={article.id} className="grid grid-cols-12 gap-4 p-6 hover:bg-gray-50 transition-colors border-l-4 border-r-4 border-black">
                  <div className="col-span-4">
                    <h3 className="font-medium text-black mb-1">{article.title}</h3>
                    {article.summary && (
                      <p className="text-sm text-gray-600 line-clamp-2">{article.summary}</p>
                    )}
                  </div>
                  
                  <div className="col-span-3">
                    <div className="text-sm text-gray-600">
                      <div className="font-medium text-black">{article.lesson_title}</div>
                      <div>{article.course_title}</div>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Icons.Clock />
                      <span className="ml-1">{article.reading_time_minutes}min</span>
                    </div>
                  </div>

                  <div className="col-span-2 text-sm text-gray-600">
                    {new Date(article.created_at).toLocaleDateString()}
                  </div>

                  <div className="col-span-1">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(article)}
                        className="p-2 border-2 border-black hover:bg-black hover:text-white"
                      >
                        <Icons.Edit />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(article)}
                        className="p-2 border-2 border-red-600 hover:bg-red-600 hover:text-white text-red-600"
                      >
                        <Icons.Delete />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {filteredArticles.length > 0 && (
            <div className="p-6 border-t-2 border-black bg-gray-50 text-center text-gray-600">
              Showing {filteredArticles.length} of {articles.length} articles
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
