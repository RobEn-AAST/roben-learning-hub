'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Module, ModuleStats, Course } from '@/services/moduleService';
import { activityLogService } from '@/services/activityLogService';
import { Lesson } from '@/services/lessonService';

// Icons
const Icons = {
  Module: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
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
  Plus: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  ),
  Book: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  Lessons: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  Search: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Filter: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
    </svg>
  ),
  Video: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  Article: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Project: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  Quiz: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
};

interface ModuleFormData {
  course_id: string;
  title: string;
  description: string;
  position?: number;
  metadata?: any;
}

interface LessonFormData {
  module_id: string;
  title: string;
  lesson_type: 'video' | 'article' | 'project' | 'quiz';
  position?: number;
  status: 'visible' | 'hidden';
  instructor_id: string;
  metadata?: any;
}

interface ContentFormData {
  // Video fields
  provider?: string;
  provider_video_id?: string;
  url?: string;
  duration_seconds?: number;
  transcript?: string;
  // Article fields
  article_title?: string;
  content?: string;
  summary?: string;
  reading_time_minutes?: number;
  // Project fields
  project_title?: string;
  project_description?: string;
  submission_instructions?: string;
  external_link?: string;
  // Quiz fields (quiz is created automatically with lesson)
}

interface Filters {
  course_id?: string;
  search?: string;
}

type WorkflowStep = 'module' | 'lesson' | 'content';

export function ModulesAdminDashboard() {
  const [modules, setModules] = useState<Module[]>([]);
  const [stats, setStats] = useState<ModuleStats | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<Filters>({});
  const [error, setError] = useState('');
  
  // Workflow state management
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('module');
  const [currentModuleId, setCurrentModuleId] = useState<string>('');
  const [currentLessonId, setCurrentLessonId] = useState<string>('');
  const [currentLessonType, setCurrentLessonType] = useState<'video' | 'article' | 'project' | 'quiz'>('video');
  
  const [formData, setFormData] = useState<ModuleFormData>({
    course_id: '',
    title: '',
    description: ''
  });

  const [lessonFormData, setLessonFormData] = useState<LessonFormData>({
    module_id: '',
    title: '',
    lesson_type: 'video',
    status: 'visible',
    instructor_id: ''
  });

  const [contentFormData, setContentFormData] = useState<ContentFormData>({});

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadModules();
  }, [currentPage, filters]);

  const loadInitialData = async () => {
    try {
      const [statsResponse, coursesResponse, instructorsResponse] = await Promise.all([
        fetch('/api/admin/modules/stats'),
        fetch('/api/admin/modules/courses'),
        fetch('/api/admin/lessons/instructors')
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      if (coursesResponse.ok) {
        const coursesData = await coursesResponse.json();
        setCourses(coursesData);
      }

      if (instructorsResponse.ok) {
        const instructorsData = await instructorsResponse.json();
        setInstructors(instructorsData);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadModules = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...filters
      });

      const response = await fetch(`/api/admin/modules?${params}`);
      if (response.ok) {
        const data = await response.json();
        setModules(data.modules);
        setTotalPages(Math.ceil(data.total / 10));
      }
    } catch (error) {
      console.error('Error loading modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const url = editingModule 
        ? `/api/admin/modules/${editingModule.id}`
        : '/api/admin/modules';
      
      const method = editingModule ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Add activity logging
        if (editingModule) {
          // Log module update
          await activityLogService.logModuleUpdated(
            editingModule.id,
            formData.title,
            editingModule.title // old title
          );
          // Close form after successful update
          await loadModules();
          await loadInitialData();
          resetForm();
        } else {
          // Log module creation
          const createdModule = result; // API returns module directly, not wrapped
          
          await activityLogService.logActivity({
            action: 'CREATE',
            table_name: 'modules',
            record_id: createdModule.id,
            record_name: formData.title,
            description: `Created new module: "${formData.title}"`
          });
          
          // Set the current module ID and automatically go to lesson step
          const moduleId = createdModule.id;
          console.log('Module created, advancing to lesson step. Module ID:', moduleId);
          console.log('Full module response:', createdModule);
          
          // Update all states before re-rendering
          setCurrentModuleId(moduleId);
          setLessonFormData({
            module_id: moduleId,
            title: '',
            lesson_type: 'video',
            status: 'visible',
            instructor_id: ''
          });
          setError('');
          setWorkflowStep('lesson');
          
          // Load modules in background (don't await to prevent blocking)
          loadModules();
          loadInitialData();
        }
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to save module');
      }
    } catch (error) {
      console.error('Error saving module:', error);
      setError('Error saving module');
    } finally {
      setLoading(false);
    }
  };

  const handleLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentModuleId) return;
    
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/admin/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...lessonFormData,
          module_id: currentModuleId
        })
      });

      if (response.ok) {
        const result = await response.json();
        const createdLesson = result; // API returns lesson directly, not wrapped
        
        setCurrentLessonId(createdLesson.id);
        setCurrentLessonType(lessonFormData.lesson_type);
        
        console.log('Lesson created:', createdLesson);
        
        // Log activity
        await activityLogService.logActivity({
          action: 'CREATE',
          table_name: 'lessons',
          record_id: createdLesson.id,
          record_name: lessonFormData.title,
          description: `Created new lesson: "${lessonFormData.title}"`
        });
        
        setError('');
        // If lesson type is quiz, create quiz and show success message
        if (lessonFormData.lesson_type === 'quiz') {
          await createQuizForLesson(createdLesson.id, lessonFormData.title);
          // Stay on lesson step to show the success message
        } else {
          // Automatically advance to content creation for non-quiz lessons
          setWorkflowStep('content');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create lesson');
      }
    } catch (error) {
      console.error('Error creating lesson:', error);
      setError('Failed to create lesson');
    } finally {
      setLoading(false);
    }
  };

  const createQuizForLesson = async (lessonId: string, lessonTitle: string) => {
    try {
      const response = await fetch('/api/admin/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: lessonId,
          title: `${lessonTitle} Quiz`,
          description: `Quiz for ${lessonTitle}`
        })
      });

      if (response.ok) {
        setError('Lesson and quiz created successfully!');
      }
    } catch (error) {
      console.error('Error creating quiz:', error);
    }
  };

  const handleContentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLessonId) return;
    
    setError('');
    setLoading(true);
    try {
      let endpoint = '';
      let bodyData: any = { lesson_id: currentLessonId };

      switch (currentLessonType) {
        case 'video':
          endpoint = '/api/admin/videos';
          bodyData = {
            lesson_id: currentLessonId,
            provider: contentFormData.provider || 'youtube',
            provider_video_id: contentFormData.provider_video_id || '',
            url: contentFormData.url || '',
            duration_seconds: parseInt(String(contentFormData.duration_seconds || 0)),
            transcript: contentFormData.transcript || '',
            metadata: {}
          };
          console.log('Video data to submit:', bodyData);
          break;
        case 'article':
          endpoint = '/api/admin/articles';
          bodyData = {
            lesson_id: currentLessonId,
            title: contentFormData.article_title || '',
            content: contentFormData.content || '',
            summary: contentFormData.summary || '',
            reading_time_minutes: parseInt(String(contentFormData.reading_time_minutes || 5)),
            metadata: {}
          };
          console.log('Article data to submit:', bodyData);
          break;
        case 'project':
          endpoint = '/api/admin/projects';
          bodyData = {
            lesson_id: currentLessonId,
            title: contentFormData.project_title || '',
            description: contentFormData.project_description || '',
            submission_instructions: contentFormData.submission_instructions || null,
            external_link: contentFormData.external_link || null
          };
          console.log('Project data to submit:', bodyData);
          break;
      }

      console.log(`Submitting ${currentLessonType} to ${endpoint}`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Content created successfully:', result);
        
        // Log activity
        await activityLogService.logActivity({
          action: 'CREATE',
          table_name: `${currentLessonType}s`,
          record_id: result.id,
          record_name: contentFormData.article_title || contentFormData.project_title || 'Content',
          description: `Created new ${currentLessonType} content`
        });
        
        setError(`${currentLessonType.charAt(0).toUpperCase() + currentLessonType.slice(1)} created successfully!`);
        setContentFormData({});
      } else {
        console.error(`API Error - Status: ${response.status} ${response.statusText}`);
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: `Server error: ${response.status} ${response.statusText}` };
        }
        console.error(`Failed to create ${currentLessonType}:`, errorData);
        setError(errorData.error || errorData.message || `Failed to create ${currentLessonType} (Status: ${response.status})`);
      }
    } catch (error) {
      console.error(`Error creating ${currentLessonType}:`, error);
      setError(`Failed to create ${currentLessonType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (module: Module) => {
    setEditingModule(module);
    setFormData({
      course_id: module.course_id,
      title: module.title,
      description: module.description,
      position: module.position,
      metadata: module.metadata
    });
    setShowForm(true);
  };

  const handleDelete = async (module: Module) => {
    if (!confirm(`Are you sure you want to delete "${module.title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/modules/${module.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Log module deletion
        await activityLogService.logActivity({
          action: 'DELETE',
          table_name: 'modules',
          record_id: module.id,
          record_name: module.title,
          description: `Deleted module: "${module.title}"`
        });

        await loadModules();
        await loadInitialData();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting module:', error);
      alert('Error deleting module');
    }
  };

  const resetForm = () => {
    setFormData({
      course_id: '',
      title: '',
      description: ''
    });
    setLessonFormData({
      module_id: '',
      title: '',
      lesson_type: 'video',
      status: 'visible',
      instructor_id: ''
    });
    setContentFormData({});
    setEditingModule(null);
    setShowForm(false);
    setWorkflowStep('module');
    setCurrentModuleId('');
    setCurrentLessonId('');
    setCurrentLessonType('video');
    setError('');
  };

  // Workflow navigation functions
  const goToLessonStep = () => {
    setWorkflowStep('lesson');
  };

  const goToContentStep = (lessonType: 'video' | 'article' | 'project' | 'quiz') => {
    setCurrentLessonType(lessonType);
    setWorkflowStep('content');
  };

  const goBackToModuleStep = () => {
    setWorkflowStep('module');
  };

  const goBackToLessonStep = () => {
    setWorkflowStep('lesson');
    setContentFormData({});
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      published: 'bg-green-100 text-green-800 border-green-300',
      archived: 'bg-gray-100 text-gray-800 border-gray-300'
    } as const;
    
    return <Badge variant="outline" className={variants[status as keyof typeof variants]}>{status}</Badge>;
  };

  if (showForm) {
    // Debug logging
    console.log('Render state:', { workflowStep, currentModuleId, currentLessonId, showForm });
    
    return (
      <div className="space-y-6">
        {/* Debug Panel - Remove this after testing */}
        <Card className="bg-yellow-50 border-yellow-300">
          <CardContent className="p-4">
            <p className="text-xs font-mono">
              <strong>Debug Info:</strong><br />
              workflowStep: {workflowStep}<br />
              currentModuleId: {currentModuleId || 'null'}<br />
              currentLessonId: {currentLessonId || 'null'}<br />
              showForm: {showForm ? 'true' : 'false'}<br />
              editingModule: {editingModule ? 'yes' : 'no'}
            </p>
          </CardContent>
        </Card>
        
        {/* Step-by-step workflow header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-black">
              {workflowStep === 'module' && (editingModule ? 'Edit Module' : 'Create New Module')}
              {workflowStep === 'lesson' && 'Create Lesson'}
              {workflowStep === 'content' && `Create ${currentLessonType.charAt(0).toUpperCase() + currentLessonType.slice(1)}`}
            </h2>
            <div className="flex items-center space-x-2 mt-2">
              <span className={`px-2 py-1 rounded text-xs ${workflowStep === 'module' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                1. Module
              </span>
              <span className="text-gray-400">→</span>
              <span className={`px-2 py-1 rounded text-xs ${workflowStep === 'lesson' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                2. Lesson
              </span>
              <span className="text-gray-400">→</span>
              <span className={`px-2 py-1 rounded text-xs ${workflowStep === 'content' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                3. Content
              </span>
            </div>
          </div>
          <div className="flex space-x-2">
            {workflowStep === 'lesson' && (
              <Button variant="outline" onClick={goBackToModuleStep}>
                ← Back to Module
              </Button>
            )}
            {workflowStep === 'content' && (
              <Button variant="outline" onClick={goBackToLessonStep}>
                ← Back to Lesson
              </Button>
            )}
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>

        {/* STEP 1: Module Creation/Editing */}
        {workflowStep === 'module' && (
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-black">Module Details</CardTitle>
              <CardDescription className="text-gray-600">
                {editingModule ? 'Update module information' : 'Enter module information'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="course_id" className="text-black">Course *</Label>
                  <select
                    id="course_id"
                    value={formData.course_id}
                    onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: 'white', color: 'black' }}
                    required
                    disabled={editingModule ? true : false}
                  >
                    <option value="" style={{ backgroundColor: 'white', color: 'black' }}>Select a course</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id} style={{ backgroundColor: 'white', color: 'black' }}>
                        {course.title} ({course.status})
                      </option>
                    ))}
                  </select>
                  {editingModule && (
                    <p className="text-sm text-gray-500 mt-1">
                      Course cannot be changed when editing a module
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title" className="text-black">Title *</Label>
                  <Input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter module title"
                    style={{ backgroundColor: 'white', color: 'black' }}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-black">Description *</Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter module description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                    style={{ backgroundColor: 'white', color: 'black' }}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position" className="text-black">Position</Label>
                  <Input
                    id="position"
                    type="number"
                    value={formData.position || ''}
                    onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) })}
                    placeholder="Auto-assigned if empty"
                    style={{ backgroundColor: 'white', color: 'black' }}
                    min="1"
                  />
                  <p className="text-sm text-gray-600">
                    Position determines the order of modules in the course (1 = first)
                  </p>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {editingModule ? 'Update Module' : 'Create Module'}
                  </Button>
                </div>
                {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
              </form>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: Lesson Creation */}
        {workflowStep === 'lesson' && currentModuleId ? (
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-black">Lesson Details</CardTitle>
              <CardDescription className="text-gray-600">
                Add a lesson to your module: <strong>{formData.title}</strong>
                <br />
                <span className="text-xs text-gray-500">This lesson will be automatically assigned to this module</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLessonSubmit} className="space-y-6">
                {/* Hidden field showing module assignment */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>📚 Module:</strong> {formData.title}
                    <br />
                    <span className="text-xs text-blue-600">Lesson will be auto-assigned to this module</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lessonTitle" className="text-black font-semibold text-sm mb-2 block">Lesson Title *</Label>
                  <Input
                    id="lessonTitle"
                    type="text"
                    value={lessonFormData.title}
                    onChange={(e) => setLessonFormData({ ...lessonFormData, title: e.target.value })}
                    placeholder="Enter lesson title"
                    className="mt-2"
                    style={{ backgroundColor: 'white', color: 'black' }}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lessonType" className="text-black font-semibold text-sm mb-2 block">Lesson Type *</Label>
                  <select
                    id="lessonType"
                    value={lessonFormData.lesson_type}
                    onChange={(e) => setLessonFormData({ ...lessonFormData, lesson_type: e.target.value as any })}
                    className="w-full mt-2 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
                    required
                  >
                    <option value="video">Video</option>
                    <option value="article">Article</option>
                    <option value="project">Project</option>
                    <option value="quiz">Quiz</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instructor" className="text-black font-semibold text-sm mb-2 block">Instructor *</Label>
                  <select
                    id="instructor"
                    value={lessonFormData.instructor_id}
                    onChange={(e) => setLessonFormData({ ...lessonFormData, instructor_id: e.target.value })}
                    className="w-full mt-2 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
                    required
                  >
                    <option value="">Select an instructor</option>
                    {instructors.map((instructor) => (
                      <option key={instructor.id} value={instructor.id}>
                        {instructor.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-black font-semibold text-sm mb-2 block">Status</Label>
                  <select
                    id="status"
                    value={lessonFormData.status}
                    onChange={(e) => setLessonFormData({ ...lessonFormData, status: e.target.value as any })}
                    className="w-full mt-2 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
                  >
                    <option value="visible">Visible</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-6">
                  <Button type="button" variant="outline" onClick={goBackToModuleStep}>
                    Back to Module
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Lesson'}
                  </Button>
                </div>
                {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
              </form>
            </CardContent>
          </Card>
        ) : workflowStep === 'lesson' ? (
          <Card className="bg-red-50 border-red-300">
            <CardContent className="p-4">
              <p className="text-red-800">
                <strong>Error:</strong> Lesson form cannot display. currentModuleId is missing!<br />
                currentModuleId: {currentModuleId || 'NULL'}
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* STEP 3: Content Creation */}
        {workflowStep === 'content' && currentLessonId && currentLessonType !== 'quiz' && (
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-black">{currentLessonType.charAt(0).toUpperCase() + currentLessonType.slice(1)} Details</CardTitle>
              <CardDescription className="text-gray-600">
                Add {currentLessonType} content to your lesson
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleContentSubmit} className="space-y-6">
                {/* Video Fields */}
                {currentLessonType === 'video' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="provider" className="text-black font-semibold text-sm mb-2 block">Provider *</Label>
                      <select
                        id="provider"
                        value={contentFormData.provider || 'youtube'}
                        onChange={(e) => setContentFormData({ ...contentFormData, provider: e.target.value })}
                        className="w-full mt-2 p-3 border rounded-lg bg-white text-black"
                        required
                      >
                        <option value="youtube">YouTube</option>
                        <option value="vimeo">Vimeo</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="url" className="text-black font-semibold text-sm mb-2 block">Video URL *</Label>
                      <Input
                        id="url"
                        type="url"
                        value={contentFormData.url || ''}
                        onChange={(e) => setContentFormData({ ...contentFormData, url: e.target.value })}
                        placeholder="https://youtube.com/watch?v=..."
                        className="mt-2"
                        style={{ backgroundColor: 'white', color: 'black' }}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="provider_video_id" className="text-black font-semibold text-sm mb-2 block">Video ID *</Label>
                      <Input
                        id="provider_video_id"
                        type="text"
                        value={contentFormData.provider_video_id || ''}
                        onChange={(e) => setContentFormData({ ...contentFormData, provider_video_id: e.target.value })}
                        placeholder="Enter video ID"
                        className="mt-2"
                        style={{ backgroundColor: 'white', color: 'black' }}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duration_seconds" className="text-black font-semibold text-sm mb-2 block">Duration (seconds) *</Label>
                      <Input
                        id="duration_seconds"
                        type="number"
                        value={contentFormData.duration_seconds || 0}
                        onChange={(e) => setContentFormData({ ...contentFormData, duration_seconds: parseInt(e.target.value) })}
                        placeholder="0"
                        className="mt-2"
                        style={{ backgroundColor: 'white', color: 'black' }}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="transcript" className="text-black font-semibold text-sm mb-2 block">Transcript (optional)</Label>
                      <textarea
                        id="transcript"
                        value={contentFormData.transcript || ''}
                        onChange={(e) => setContentFormData({ ...contentFormData, transcript: e.target.value })}
                        className="w-full mt-2 p-3 border rounded-lg bg-white text-black"
                        rows={4}
                        placeholder="Enter video transcript"
                      />
                    </div>
                  </>
                )}

                {/* Article Fields */}
                {currentLessonType === 'article' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="article_title" className="text-black font-semibold text-sm mb-2 block">Article Title *</Label>
                      <Input
                        id="article_title"
                        type="text"
                        value={contentFormData.article_title || ''}
                        onChange={(e) => setContentFormData({ ...contentFormData, article_title: e.target.value })}
                        placeholder="Enter article title"
                        className="mt-2"
                        style={{ backgroundColor: 'white', color: 'black' }}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="content" className="text-black font-semibold text-sm mb-2 block">Content *</Label>
                      <textarea
                        id="content"
                        value={contentFormData.content || ''}
                        onChange={(e) => setContentFormData({ ...contentFormData, content: e.target.value })}
                        className="w-full mt-2 p-3 border rounded-lg bg-white text-black"
                        rows={10}
                        placeholder="Enter article content"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="summary" className="text-black font-semibold text-sm mb-2 block">Summary (optional)</Label>
                      <textarea
                        id="summary"
                        value={contentFormData.summary || ''}
                        onChange={(e) => setContentFormData({ ...contentFormData, summary: e.target.value })}
                        className="w-full mt-2 p-3 border rounded-lg bg-white text-black"
                        rows={3}
                        placeholder="Enter article summary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reading_time_minutes" className="text-black font-semibold text-sm mb-2 block">Reading Time (minutes) *</Label>
                      <Input
                        id="reading_time_minutes"
                        type="number"
                        value={contentFormData.reading_time_minutes || 5}
                        onChange={(e) => setContentFormData({ ...contentFormData, reading_time_minutes: parseInt(e.target.value) })}
                        placeholder="5"
                        className="mt-2"
                        style={{ backgroundColor: 'white', color: 'black' }}
                        required
                      />
                    </div>
                  </>
                )}

                {/* Project Fields */}
                {currentLessonType === 'project' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="project_title" className="text-black font-semibold text-sm mb-2 block">Project Title *</Label>
                      <Input
                        id="project_title"
                        type="text"
                        value={contentFormData.project_title || ''}
                        onChange={(e) => setContentFormData({ ...contentFormData, project_title: e.target.value })}
                        placeholder="Enter project title"
                        className="mt-2"
                        style={{ backgroundColor: 'white', color: 'black' }}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="project_description" className="text-black font-semibold text-sm mb-2 block">Description *</Label>
                      <textarea
                        id="project_description"
                        value={contentFormData.project_description || ''}
                        onChange={(e) => setContentFormData({ ...contentFormData, project_description: e.target.value })}
                        className="w-full mt-2 p-3 border rounded-lg bg-white text-black"
                        rows={6}
                        placeholder="Enter project description"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="submission_instructions" className="text-black font-semibold text-sm mb-2 block">Submission Instructions (optional)</Label>
                      <textarea
                        id="submission_instructions"
                        value={contentFormData.submission_instructions || ''}
                        onChange={(e) => setContentFormData({ ...contentFormData, submission_instructions: e.target.value })}
                        className="w-full mt-2 p-3 border rounded-lg bg-white text-black"
                        rows={4}
                        placeholder="Enter submission instructions"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="external_link" className="text-black font-semibold text-sm mb-2 block">External Link (optional)</Label>
                      <Input
                        id="external_link"
                        type="url"
                        value={contentFormData.external_link || ''}
                        onChange={(e) => setContentFormData({ ...contentFormData, external_link: e.target.value })}
                        placeholder="https://..."
                        className="mt-2"
                        style={{ backgroundColor: 'white', color: 'black' }}
                      />
                    </div>
                  </>
                )}

                <div className="flex justify-end space-x-3 pt-6">
                  <Button type="button" variant="outline" onClick={goBackToLessonStep}>
                    Back to Lesson
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Creating...' : `Create ${currentLessonType.charAt(0).toUpperCase() + currentLessonType.slice(1)}`}
                  </Button>
                </div>
                {error && <div className={`${error.includes('successfully') ? 'text-green-600' : 'text-red-600'} text-sm mt-2`}>{error}</div>}
              </form>

              {/* Add more content or finish */}
              <div className="mt-6 pt-6 border-t flex justify-center space-x-4">
                <Button 
                  onClick={() => {
                    setContentFormData({});
                    setError('');
                  }}
                  variant="outline"
                >
                  Add Another {currentLessonType.charAt(0).toUpperCase() + currentLessonType.slice(1)}
                </Button>
                <Button 
                  onClick={goBackToLessonStep}
                  variant="default"
                >
                  Finish & Create Another Lesson
                </Button>
                <Button 
                  onClick={resetForm}
                  variant="default"
                >
                  Complete & Return to List
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quiz Message - shown when quiz lesson is created */}
        {workflowStep === 'lesson' && currentLessonId && lessonFormData.lesson_type === 'quiz' && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <Icons.Quiz />
                <div>
                  <h3 className="text-lg font-semibold text-green-800">Quiz Lesson Created!</h3>
                  <p className="text-sm text-green-700 mt-1">
                    The quiz has been automatically created. You can now add questions to it from the Quizzes management page.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex space-x-3">
                <Button onClick={resetForm} variant="default">
                  Complete & Return to List
                </Button>
                <Button 
                  onClick={() => {
                    setLessonFormData({
                      module_id: currentModuleId,
                      title: '',
                      lesson_type: 'video',
                      status: 'visible',
                      instructor_id: lessonFormData.instructor_id
                    });
                    setCurrentLessonId('');
                    setError('');
                  }}
                  variant="outline"
                >
                  Create Another Lesson
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">Course Modules Management</h1>
          <p className="text-gray-600">
            Organize course content into modules for better structure and learning flow.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Icons.Plus />
          Add New Module
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Icons.Module />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Modules</p>
                  <p className="text-2xl font-bold text-black">{stats.totalModules}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Icons.Book />
                <div>
                  <p className="text-sm font-medium text-gray-600">Courses with Modules</p>
                  <p className="text-2xl font-bold text-black">{Object.keys(stats.modulesByCourse).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Icons.Lessons />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Lessons</p>
                  <p className="text-2xl font-bold text-black">{stats.totalLessons}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Icons.Module />
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Lessons/Module</p>
                  <p className="text-2xl font-bold text-black">{stats.averageLessonsPerModule}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-black flex items-center space-x-2">
            <Icons.Filter />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="filter-course" className="text-black">Course</Label>
              <select
                id="filter-course"
                value={filters.course_id || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters({ ...filters, course_id: value || undefined });
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: 'white', color: 'black' }}
              >
                <option value="" style={{ backgroundColor: 'white', color: 'black' }}>All Courses</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id} style={{ backgroundColor: 'white', color: 'black' }}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-search" className="text-black">Search</Label>
              <div className="relative">
                <Input
                  id="filter-search"
                  type="text"
                  value={filters.search || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFilters({ ...filters, search: value || undefined });
                    setCurrentPage(1);
                  }}
                  placeholder="Search modules by title or description..."
                  className="pl-10 bg-white text-black"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Icons.Search />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modules List */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-black">Modules</CardTitle>
          <CardDescription className="text-gray-600">
            Manage course modules and their organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading modules...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium text-black">Module Details</th>
                    <th className="text-left p-4 font-medium text-black">Course</th>
                    <th className="text-left p-4 font-medium text-black">Position</th>
                    <th className="text-left p-4 font-medium text-black">Lessons</th>
                    <th className="text-left p-4 font-medium text-black">Created</th>
                    <th className="text-left p-4 font-medium text-black">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {modules.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-600">
                        No modules found.
                      </td>
                    </tr>
                  ) : (
                    modules.map((module) => (
                      <tr key={module.id} className="border-b hover:bg-gray-50">
                        <td className="p-4">
                          <div>
                            <div className="font-medium text-black flex items-center space-x-2">
                              <Icons.Module />
                              <span>{module.title}</span>
                            </div>
                            <div className="text-sm text-gray-600 truncate max-w-xs">
                              {module.description}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div>
                            <div className="font-medium text-black">{module.course?.title}</div>
                            {module.course?.status && getStatusBadge(module.course.status)}
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge className="bg-blue-100 text-blue-800 border-blue-300">Position {module.position}</Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-1">
                            <Icons.Lessons />
                            <span className="text-sm text-gray-800">{module.lessons_count || 0} lesson(s)</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-gray-600">
                            {new Date(module.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(module)}
                            >
                              <Icons.Edit />
                              <span className="ml-1">Edit</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(module)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Icons.Delete />
                              <span className="ml-1">Delete</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center space-x-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-black">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}