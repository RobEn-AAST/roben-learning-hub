'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { videoService, Video, VideoStats, VideoQuestion, Lesson, CreateVideoData, UpdateVideoData } from '@/services/videoService';
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
  Video: () => (
    <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
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
  ),
  QuestionMark: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Search: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  ExternalLink: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  )
};

interface VideoFormData {
  lesson_id: string;
  provider: string;
  provider_video_id: string;
  url: string;
  duration_seconds: number;
  transcript: string;
  metadata: Record<string, unknown>;
}

interface VideoQuestionFormData {
  question: string;
  timestamp_seconds: number;
}

type ViewMode = 'list' | 'create' | 'edit' | 'view' | 'questions';

interface VideoTableProps {
  videos: Video[];
  onEdit: (video: Video) => void;
  onDelete: (videoId: string) => void;
  onView: (video: Video) => void;
  onManageQuestions: (video: Video) => void;
}

function VideoTable({ videos, onEdit, onDelete, onView, onManageQuestions }: VideoTableProps) {
  const getProviderBadge = (provider: string) => {
    const colors = {
      youtube: 'bg-red-100 text-red-800',
      vimeo: 'bg-blue-100 text-blue-800',
      wistia: 'bg-green-100 text-green-800',
      other: 'bg-gray-100 text-gray-800'
    } as const;
    
    return (
      <Badge className={colors[provider as keyof typeof colors] || colors.other}>
        {provider}
      </Badge>
    );
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-black">Videos Management</CardTitle>
        <CardDescription className="text-gray-600">Manage all your videos and their content</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4 font-medium text-black">Video Details</th>
                <th className="text-left p-4 font-medium text-black">Lesson</th>
                <th className="text-left p-4 font-medium text-black">Provider</th>
                <th className="text-left p-4 font-medium text-black">Duration</th>
                <th className="text-left p-4 font-medium text-black">Created</th>
                <th className="text-left p-4 font-medium text-black">Actions</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((video) => (
                <tr key={video.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div>
                      <div className="font-medium text-black truncate max-w-xs">
                        {video.url}
                      </div>
                      <div className="text-sm text-gray-600">
                        ID: {video.provider_video_id}
                      </div>
                      {video.transcript && (
                        <div className="text-xs text-green-600 mt-1">
                          Has transcript
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <div className="font-medium text-black text-sm">
                        {video.lesson_title}
                      </div>
                      <div className="text-xs text-gray-600">
                        {video.course_title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {video.module_title}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {getProviderBadge(video.provider)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-1">
                      <Icons.Clock />
                      <span className="text-sm text-black">
                        {formatDuration(video.duration_seconds)}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-black">{formatDate(video.created_at)}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onView(video)}
                        className="flex items-center space-x-1"
                      >
                        <Icons.View />
                        <span>View</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(video)}
                        className="flex items-center space-x-1"
                      >
                        <Icons.Edit />
                        <span>Edit</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onManageQuestions(video)}
                        className="flex items-center space-x-1"
                      >
                        <Icons.QuestionMark />
                        <span>Questions</span>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onDelete(video.id)}
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
          {videos.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No videos found. Create your first video to get started!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface StatsCardProps {
  title: string;
  value: string | number;
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

interface VideoFormProps {
  video?: Video | null;
  onSave: (videoData: VideoFormData) => void;
  onCancel: () => void;
  loading: boolean;
  lessons: Lesson[];
}

function VideoForm({ video, onSave, onCancel, loading, lessons }: VideoFormProps) {
  const [formData, setFormData] = useState<VideoFormData>({
    lesson_id: video?.lesson_id || '',
    provider: video?.provider || 'youtube',
    provider_video_id: video?.provider_video_id || '',
    url: video?.url || '',
    duration_seconds: video?.duration_seconds || 0,
    transcript: video?.transcript || '',
    metadata: video?.metadata || {}
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  const handleInputChange = (field: keyof VideoFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-black">
          {video ? 'Edit Video' : 'Create New Video'}
        </CardTitle>
        <CardDescription className="text-gray-600">
          {video ? 'Update video information' : 'Add a new video to the system'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="lesson_id" className="text-black">Lesson</Label>
              <select
                id="lesson_id"
                value={formData.lesson_id}
                onChange={(e) => handleInputChange('lesson_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                required
              >
                <option value="">Select a lesson</option>
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.course_title} → {lesson.module_title} → {lesson.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider" className="text-black">Provider</Label>
              <select
                id="provider"
                value={formData.provider}
                onChange={(e) => handleInputChange('provider', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                required
              >
                <option value="youtube">YouTube</option>
                <option value="vimeo">Vimeo</option>
                <option value="wistia">Wistia</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider_video_id" className="text-black">Provider Video ID</Label>
              <Input
                id="provider_video_id"
                type="text"
                value={formData.provider_video_id}
                onChange={(e) => handleInputChange('provider_video_id', e.target.value)}
                className="bg-white text-black"
                placeholder="e.g., dQw4w9WgXcQ"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration_seconds" className="text-black">Duration (seconds)</Label>
              <Input
                id="duration_seconds"
                type="number"
                value={formData.duration_seconds}
                onChange={(e) => handleInputChange('duration_seconds', parseInt(e.target.value) || 0)}
                className="bg-white text-black"
                min="0"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="url" className="text-black">Video URL</Label>
            <Input
              id="url"
              type="url"
              value={formData.url}
              onChange={(e) => handleInputChange('url', e.target.value)}
              className="bg-white text-black"
              placeholder="https://..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transcript" className="text-black">Transcript (Optional)</Label>
            <textarea
              id="transcript"
              value={formData.transcript}
              onChange={(e) => handleInputChange('transcript', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
              rows={6}
              placeholder="Video transcript..."
            />
          </div>

          <div className="flex space-x-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <Icons.Save />
              <span>{loading ? 'Saving...' : 'Save Video'}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex items-center space-x-2"
            >
              <Icons.Cancel />
              <span>Cancel</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

interface VideoViewProps {
  video: Video;
  onEdit: () => void;
  onClose: () => void;
}

function VideoView({ video, onEdit, onClose }: VideoViewProps) {
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-black">Video Details</CardTitle>
        <CardDescription className="text-gray-600">View video information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label className="text-black font-medium">Video URL</Label>
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-gray-700 break-all">{video.url}</p>
              <a 
                href={video.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                <Icons.ExternalLink />
              </a>
            </div>
          </div>
          
          <div>
            <Label className="text-black font-medium">Provider</Label>
            <p className="text-gray-700 mt-1 capitalize">{video.provider}</p>
          </div>
          
          <div>
            <Label className="text-black font-medium">Provider Video ID</Label>
            <p className="text-gray-700 mt-1">{video.provider_video_id}</p>
          </div>
          
          <div>
            <Label className="text-black font-medium">Duration</Label>
            <p className="text-gray-700 mt-1">{formatDuration(video.duration_seconds)}</p>
          </div>
          
          <div>
            <Label className="text-black font-medium">Course</Label>
            <p className="text-gray-700 mt-1">{video.course_title}</p>
          </div>
          
          <div>
            <Label className="text-black font-medium">Module</Label>
            <p className="text-gray-700 mt-1">{video.module_title}</p>
          </div>
          
          <div>
            <Label className="text-black font-medium">Lesson</Label>
            <p className="text-gray-700 mt-1">{video.lesson_title}</p>
          </div>
          
          <div>
            <Label className="text-black font-medium">Created</Label>
            <p className="text-gray-700 mt-1">
              {new Date(video.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>

        {video.transcript && (
          <div>
            <Label className="text-black font-medium">Transcript</Label>
            <div className="mt-1 p-4 bg-gray-50 rounded-md max-h-64 overflow-y-auto">
              <p className="text-gray-700 whitespace-pre-wrap">{video.transcript}</p>
            </div>
          </div>
        )}

        {video.metadata && Object.keys(video.metadata).length > 0 && (
          <div>
            <Label className="text-black font-medium">Metadata</Label>
            <div className="mt-1 p-4 bg-gray-50 rounded-md">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(video.metadata, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <div className="flex space-x-4">
          <Button onClick={onEdit} className="flex items-center space-x-2">
            <Icons.Edit />
            <span>Edit Video</span>
          </Button>
          <Button variant="outline" onClick={onClose} className="flex items-center space-x-2">
            <Icons.Cancel />
            <span>Close</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface VideoQuestionsManagerProps {
  video: Video;
  onClose: () => void;
}

function VideoQuestionsManager({ video, onClose }: VideoQuestionsManagerProps) {
  const [questions, setQuestions] = useState<VideoQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<VideoQuestion | null>(null);
  const [formData, setFormData] = useState<VideoQuestionFormData>({
    question: '',
    timestamp_seconds: 0
  });

  useEffect(() => {
    loadQuestions();
  }, [video.id]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const data = await videoService.getVideoQuestions(video.id);
      setQuestions(data);
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuestion = async () => {
    try {
      setLoading(true);
      if (editingQuestion) {
        await videoService.updateVideoQuestion(editingQuestion.id, formData);
      } else {
        await videoService.createVideoQuestion({
          ...formData,
          video_id: video.id
        });
      }
      await loadQuestions();
      setShowForm(false);
      setEditingQuestion(null);
      setFormData({ question: '', timestamp_seconds: 0 });
    } catch (error) {
      console.error('Error saving question:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditQuestion = (question: VideoQuestion) => {
    setEditingQuestion(question);
    setFormData({
      question: question.question,
      timestamp_seconds: question.timestamp_seconds
    });
    setShowForm(true);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    
    try {
      setLoading(true);
      await videoService.deleteVideoQuestion(questionId);
      await loadQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-black">Manage Video Questions</CardTitle>
        <CardDescription className="text-gray-600">
          Add interactive questions for: {video.url}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-black">Questions ({questions.length})</h3>
          <Button 
            onClick={() => {
              setShowForm(true);
              setEditingQuestion(null);
              setFormData({ question: '', timestamp_seconds: 0 });
            }}
            className="flex items-center space-x-2"
          >
            <Icons.Plus />
            <span>Add Question</span>
          </Button>
        </div>

        {showForm && (
          <Card className="bg-gray-50">
            <CardContent className="p-4 space-y-4">
              <h4 className="font-medium text-black">
                {editingQuestion ? 'Edit Question' : 'Add New Question'}
              </h4>
              
              <div className="space-y-2">
                <Label htmlFor="timestamp" className="text-black">Timestamp (seconds)</Label>
                <Input
                  id="timestamp"
                  type="number"
                  value={formData.timestamp_seconds}
                  onChange={(e) => setFormData(prev => ({ ...prev, timestamp_seconds: parseInt(e.target.value) || 0 }))}
                  className="bg-white text-black"
                  min="0"
                  required
                />
                <p className="text-sm text-gray-600">
                  Preview: {formatTimestamp(formData.timestamp_seconds)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="question" className="text-black">Question</Label>
                <textarea
                  id="question"
                  value={formData.question}
                  onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                  rows={3}
                  placeholder="Enter your question..."
                  required
                />
              </div>

              <div className="flex space-x-2">
                <Button 
                  onClick={handleSaveQuestion}
                  disabled={loading}
                  className="flex items-center space-x-1"
                >
                  <Icons.Save />
                  <span>{loading ? 'Saving...' : 'Save'}</span>
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingQuestion(null);
                  }}
                  className="flex items-center space-x-1"
                >
                  <Icons.Cancel />
                  <span>Cancel</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {questions.map((question) => (
            <Card key={question.id} className="bg-gray-50">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {formatTimestamp(question.timestamp_seconds)}
                      </Badge>
                    </div>
                    <p className="text-gray-700">{question.question}</p>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditQuestion(question)}
                      className="flex items-center space-x-1"
                    >
                      <Icons.Edit />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteQuestion(question.id)}
                      className="flex items-center space-x-1"
                    >
                      <Icons.Delete />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {questions.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              No questions added yet. Click &quot;Add Question&quot; to get started!
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose} className="flex items-center space-x-2">
            <Icons.Cancel />
            <span>Close</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VideoAdminDashboard() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [stats, setStats] = useState<VideoStats | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<string>('');

  useEffect(() => {
    loadVideos();
    loadStats();
    loadLessons();
  }, []);

  useEffect(() => {
    // Filter videos based on search term, lesson, and provider
    let filtered = videos;

    // Filter by search term
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(video =>
        video.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
        video.provider_video_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        video.lesson_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        video.course_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        video.transcript?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by lesson
    if (selectedLesson) {
      filtered = filtered.filter(video => video.lesson_id === selectedLesson);
    }

    // Filter by provider
    if (selectedProvider) {
      filtered = filtered.filter(video => video.provider === selectedProvider);
    }

    setFilteredVideos(filtered);
  }, [searchTerm, selectedLesson, selectedProvider, videos]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const data = await videoService.getAllVideos();
      setVideos(data);
      setFilteredVideos(data);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await videoService.getVideoStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadLessons = async () => {
    try {
      const data = await videoService.getLessonsForSelect();
      setLessons(data);
    } catch (error) {
      console.error('Error loading lessons:', error);
    }
  };

  const handleCreateVideo = async (videoData: VideoFormData) => {
    try {
      setLoading(true);
      await videoService.createVideo(videoData as CreateVideoData);
      await loadVideos();
      await loadStats();
      setViewMode('list');
      
      // Log activity
      await activityLogService.logActivity({
        action: 'create_video',
        resource_type: 'video',
        details: `Created video: ${videoData.url}`,
        metadata: videoData
      });
    } catch (error) {
      console.error('Error creating video:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateVideo = async (videoData: VideoFormData) => {
    if (!selectedVideo) return;

    try {
      setLoading(true);
      await videoService.updateVideo(selectedVideo.id, videoData as UpdateVideoData);
      await loadVideos();
      await loadStats();
      setViewMode('list');
      setSelectedVideo(null);
      
      // Log activity
      await activityLogService.logActivity({
        action: 'update_video',
        resource_type: 'video',
        resource_id: selectedVideo.id,
        details: `Updated video: ${videoData.url}`,
        metadata: { old_data: selectedVideo, new_data: videoData }
      });
    } catch (error) {
      console.error('Error updating video:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video? This will also delete all associated questions.')) {
      return;
    }

    try {
      setLoading(true);
      const video = videos.find(v => v.id === videoId);
      await videoService.deleteVideo(videoId);
      await loadVideos();
      await loadStats();
      
      // Log activity
      await activityLogService.logActivity({
        action: 'delete_video',
        resource_type: 'video',
        resource_id: videoId,
        details: `Deleted video: ${video?.url || 'Unknown'}`,
        metadata: { deleted_video: video }
      });
    } catch (error) {
      console.error('Error deleting video:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewVideo = (video: Video) => {
    setSelectedVideo(video);
    setViewMode('view');
  };

  const handleEditVideo = (video: Video) => {
    setSelectedVideo(video);
    setViewMode('edit');
  };

  const handleManageQuestions = (video: Video) => {
    setSelectedVideo(video);
    setViewMode('questions');
  };

  const handleCancel = () => {
    setViewMode('list');
    setSelectedVideo(null);
  };

  const handleCreateNew = () => {
    setSelectedVideo(null);
    setViewMode('create');
  };

  const handleEditFromView = () => {
    setViewMode('edit');
  };

  // Create/Edit Form View
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-black">
            {viewMode === 'create' ? 'Create New Video' : 'Edit Video'}
          </h1>
          <Button onClick={handleCancel} variant="outline">
            ← Back to List
          </Button>
        </div>
        
        <VideoForm
          video={viewMode === 'edit' ? selectedVideo : undefined}
          onSave={viewMode === 'create' ? handleCreateVideo : handleUpdateVideo}
          onCancel={handleCancel}
          loading={loading}
          lessons={lessons}
        />
      </div>
    );
  }

  // View Details
  if (viewMode === 'view' && selectedVideo) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-black">Video Details</h1>
          <Button onClick={handleCancel} variant="outline">
            ← Back to List
          </Button>
        </div>
        
        <VideoView
          video={selectedVideo}
          onEdit={handleEditFromView}
          onClose={handleCancel}
        />
      </div>
    );
  }

  // Questions Management
  if (viewMode === 'questions' && selectedVideo) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-black">Manage Video Questions</h1>
          <Button onClick={handleCancel} variant="outline">
            ← Back to List
          </Button>
        </div>
        
        <VideoQuestionsManager
          video={selectedVideo}
          onClose={handleCancel}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-lg text-black">Loading videos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-black">Videos Dashboard</h1>
          <p className="text-gray-600">Manage your learning platform videos</p>
        </div>
        <Button onClick={handleCreateNew} className="flex items-center space-x-2">
          <Icons.Plus />
          <span>Create Video</span>
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Videos"
            value={stats.total_videos}
            icon={<Icons.Video />}
            color="bg-blue-100"
          />
          <StatsCard
            title="Total Duration"
            value={`${stats.total_duration_hours}h`}
            icon={<Icons.Clock />}
            color="bg-green-100"
          />
          <StatsCard
            title="With Questions"
            value={stats.videos_with_questions}
            icon={<Icons.QuestionMark />}
            color="bg-purple-100"
          />
          <StatsCard
            title="With Transcript"
            value={stats.videos_with_transcript}
            icon={<Icons.Video />}
            color="bg-orange-100"
          />
        </div>
      )}

      {/* Search and Filters */}
      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search videos by URL, ID, lesson, course, or transcript..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white text-black"
              />
            </div>
            <div className="flex gap-4">
              <select
                value={selectedLesson}
                onChange={(e) => setSelectedLesson(e.target.value)}
                className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
              >
                <option value="">All Lessons</option>
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.course_title} → {lesson.module_title} → {lesson.title}
                  </option>
                ))}
              </select>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
              >
                <option value="">All Providers</option>
                <option value="youtube">YouTube</option>
                <option value="vimeo">Vimeo</option>
                <option value="wistia">Wistia</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Videos Table */}
      <VideoTable
        videos={filteredVideos}
        onEdit={handleEditVideo}
        onDelete={handleDeleteVideo}
        onView={handleViewVideo}
        onManageQuestions={handleManageQuestions}
      />
    </div>
  );
}
