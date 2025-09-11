'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { projectService, Project, ProjectStats, Lesson, CreateProjectData, UpdateProjectData } from '@/services/projectService';
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
  Project: () => (
    <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
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
  Link: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
  Instructions: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
  ),
  ChartBar: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
};

interface FormData {
  lesson_id: string;
  title: string;
  description: string;
  submission_instructions: string;
  external_link: string;
}

export default function ProjectAdminDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<string>('');

  const [formData, setFormData] = useState<FormData>({
    lesson_id: '',
    title: '',
    description: '',
    submission_instructions: '',
    external_link: ''
  });

  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  useEffect(() => {
    loadData();
    // Log dashboard access
    activityLogService.logActivity({
      action: 'VIEW',
      resource_type: 'projects',
      details: 'Accessed project management dashboard'
    });
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projectsData, lessonsData, statsData] = await Promise.all([
        fetch('/api/admin/projects').then(res => res.json()),
        fetch('/api/admin/projects/lessons').then(res => res.json()),
        fetch('/api/admin/projects/stats').then(res => res.json())
      ]);

      setProjects(projectsData);
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

    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    }

    if (!formData.lesson_id) {
      errors.lesson_id = 'Lesson is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const projectData: CreateProjectData = {
        lesson_id: formData.lesson_id,
        title: formData.title,
        description: formData.description,
        submission_instructions: formData.submission_instructions || undefined,
        external_link: formData.external_link || undefined
      };

      if (editingProject) {
        // Update existing project
        const response = await fetch(`/api/admin/projects/${editingProject.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectData)
        });

        if (!response.ok) throw new Error('Failed to update project');
      } else {
        // Create new project
        const response = await fetch('/api/admin/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectData)
        });

        if (!response.ok) throw new Error('Failed to create project');
      }

      // Reset form and reload data
      setFormData({
        lesson_id: '',
        title: '',
        description: '',
        submission_instructions: '',
        external_link: ''
      });
      setIsCreating(false);
      setEditingProject(null);
      setFormErrors({});
      await loadData();
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Failed to save project. Please try again.');
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      lesson_id: project.lesson_id,
      title: project.title,
      description: project.description,
      submission_instructions: project.submission_instructions || '',
      external_link: project.external_link || ''
    });
    setIsCreating(true);
  };

  const handleDelete = async (project: Project) => {
    if (!confirm(`Are you sure you want to delete "${project.title}"?`)) return;

    try {
      const response = await fetch(`/api/admin/projects/${project.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete project');

      await loadData();
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setIsCreating(false);
    setEditingProject(null);
    setFormData({
      lesson_id: '',
      title: '',
      description: '',
      submission_instructions: '',
      external_link: ''
    });
    setFormErrors({});
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.lesson_title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLesson = !selectedLesson || project.lesson_id === selectedLesson;
    return matchesSearch && matchesLesson;
  });

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-black">Loading project management...</div>
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
            <h1 className="text-3xl font-bold text-black">Project Management</h1>
            <p className="text-gray-600 mt-2">Manage student projects and assignments for lessons</p>
          </div>
          <Button 
            onClick={() => setIsCreating(!isCreating)}
            className="flex items-center space-x-2"
          >
            <Icons.Plus />
            <span>{isCreating ? 'Cancel' : 'Add Project'}</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="border-2 border-black shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 mr-4">
                  <Icons.Project />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Projects</p>
                  <h3 className="text-2xl font-bold text-black">{stats.total_projects}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-2 border-black shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 mr-4">
                  <Icons.Link />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">With External Links</p>
                  <h3 className="text-2xl font-bold text-black">{stats.projects_with_external_links}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-2 border-black shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 mr-4">
                  <Icons.Instructions />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">With Instructions</p>
                  <h3 className="text-2xl font-bold text-black">{stats.projects_with_instructions}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-2 border-black shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-orange-100 mr-4">
                  <Icons.ChartBar />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg per Lesson</p>
                  <h3 className="text-2xl font-bold text-black">{stats.average_projects_per_lesson}</h3>
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
              <Icons.Project />
              <span>{editingProject ? 'Edit Project' : 'Create New Project'}</span>
            </CardTitle>
            <CardDescription className="text-gray-600">
              {editingProject ? 'Update the project information below' : 'Fill in the details to create a new project'}
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
                  <Label htmlFor="external_link" className="text-black font-medium">External Link</Label>
                  <Input
                    id="external_link"
                    type="url"
                    value={formData.external_link}
                    onChange={(e) => setFormData({ ...formData, external_link: e.target.value })}
                    placeholder="https://example.com (optional)"
                    className="mt-2 p-3 border-2 border-black bg-white text-black"
                  />
                </div>
              </div>

              <div className="border-2 border-black rounded-lg p-4">
                <Label htmlFor="title" className="text-black font-medium">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Project title"
                  className="mt-2 p-3 border-2 border-black bg-white text-black"
                  required
                />
                {formErrors.title && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.title}</p>
                )}
              </div>

              <div className="border-2 border-black rounded-lg p-4">
                <Label htmlFor="description" className="text-black font-medium">Description *</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Project description and requirements"
                  className="w-full mt-2 p-3 border-2 border-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
                  rows={4}
                  required
                />
                {formErrors.description && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.description}</p>
                )}
              </div>

              <div className="border-2 border-black rounded-lg p-4">
                <Label htmlFor="submission_instructions" className="text-black font-medium">Submission Instructions</Label>
                <textarea
                  id="submission_instructions"
                  value={formData.submission_instructions}
                  onChange={(e) => setFormData({ ...formData, submission_instructions: e.target.value })}
                  placeholder="Instructions for how students should submit their work (optional)"
                  className="w-full mt-2 p-3 border-2 border-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t-2 border-black">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCancelEdit} 
                  className="px-6 py-3 text-black border-2 border-black hover:bg-black hover:text-white transition-colors duration-200"
                >
                  <Icons.Cancel />
                  <span className="ml-2">Cancel</span>
                </Button>
                <Button 
                  type="submit" 
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white border-2 border-purple-600 hover:border-purple-700"
                >
                  <Icons.Save />
                  <span className="ml-2">{editingProject ? 'Update' : 'Create'} Project</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Projects Management Section */}
      <Card className="border-2 border-black shadow-lg bg-white">
        <CardHeader className="border-b-2 border-black">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-black">Projects Management</CardTitle>
              <CardDescription className="text-gray-600">Manage all your projects and assignments</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative border-2 border-black rounded-lg">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Icons.Search />
                </div>
                <Input
                  placeholder="Search projects..."
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
            <div className="col-span-4">Project Details</div>
            <div className="col-span-3">Lesson</div>
            <div className="col-span-2">Features</div>
            <div className="col-span-2">Created</div>
            <div className="col-span-1">Actions</div>
          </div>

          {/* Projects List */}
          <div className="divide-y-2 divide-black">
            {filteredProjects.length === 0 ? (
              <div className="p-12 text-center border-2 border-black m-4 rounded-lg">
                <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-full bg-gray-100">
                    <Icons.Project />
                  </div>
                </div>
                <h3 className="text-lg font-medium text-black mb-2">No projects found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || selectedLesson ? 'Try adjusting your filters' : 'Create your first project to get started!'}
                </p>
              </div>
            ) : (
              filteredProjects.map((project) => (
                <div key={project.id} className="grid grid-cols-12 gap-4 p-6 hover:bg-gray-50 transition-colors border-l-4 border-r-4 border-black">
                  <div className="col-span-4">
                    <h3 className="font-medium text-black mb-1">{project.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
                  </div>
                  
                  <div className="col-span-3">
                    <div className="text-sm text-gray-600">
                      <div className="font-medium text-black">{project.lesson_title}</div>
                      <div>{project.course_title}</div>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <div className="flex flex-col space-y-1">
                      {project.external_link && (
                        <Badge variant="outline" className="w-fit">
                          <Icons.Link />
                          <span className="ml-1">External Link</span>
                        </Badge>
                      )}
                      {project.submission_instructions && (
                        <Badge variant="outline" className="w-fit">
                          <Icons.Instructions />
                          <span className="ml-1">Instructions</span>
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="col-span-2 text-sm text-gray-600">
                    {new Date(project.created_at).toLocaleDateString()}
                  </div>

                  <div className="col-span-1">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(project)}
                        className="p-2 border-2 border-black hover:bg-black hover:text-white"
                      >
                        <Icons.Edit />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(project)}
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

          {filteredProjects.length > 0 && (
            <div className="p-6 border-t-2 border-black bg-gray-50 text-center text-gray-600">
              Showing {filteredProjects.length} of {projects.length} projects
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
