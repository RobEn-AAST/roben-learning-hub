"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { quizService , Quiz } from "@/services/quizService";

// Icons (copied from LessonsAdminDashboard for visual match)
const Icons = {
  Quiz: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
  Filter: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
    </svg>
  )
};

export default function QuizAdminDashboard() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [formData, setFormData] = useState({
    lessonId: '',
    title: '',
    description: ''
  });
  const [filterLesson, setFilterLesson] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);


  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [quizzesData, lessonsData] = await Promise.all([
        quizService.getQuizzes(),
        quizService.getLessons()
      ]);
      setQuizzes(quizzesData);
      setLessons(lessonsData);
    } catch (e) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let quiz;
      if (editingQuiz) {
        // Update logic here if needed
        quiz = null;
      } else {
        quiz = await quizService.createQuiz(formData.lessonId, formData.title, formData.description);
      }
      if (quiz) {
        setShowForm(false);
        setFormData({ lessonId: '', title: '', description: '' });
        setEditingQuiz(null);
        await loadInitialData();
      } else {
        setError('Failed to create quiz');
      }
    } catch (e) {
      setError('Failed to create quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setFormData({
      lessonId: quiz.lessonId,
      title: quiz.title,
      description: quiz.description || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (quiz: Quiz) => {
    // Implement delete logic if needed
    alert('Delete not implemented');
  };

  const resetForm = () => {
    setFormData({ lessonId: '', title: '', description: '' });
    setEditingQuiz(null);
    setShowForm(false);
  };


  // Filtered and searched quizzes
  const filteredQuizzes = quizzes.filter(q => {
    const matchesLesson = filterLesson ? q.lessonId === filterLesson : true;
    const matchesSearch = search ? q.title.toLowerCase().includes(search.toLowerCase()) : true;
    return matchesLesson && matchesSearch;
  });
  // Paginate client-side for demo
  const pageSize = 10;
  const paginatedQuizzes = filteredQuizzes.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => {
    setTotalPages(Math.max(1, Math.ceil(filteredQuizzes.length / pageSize)));
    if (currentPage > Math.ceil(filteredQuizzes.length / pageSize)) setCurrentPage(1);
  }, [filteredQuizzes.length]);

  // Stats (mocked for now)
  const stats = {
    totalQuizzes: quizzes.length,
    lessonsWithQuizzes: lessons.filter(l => quizzes.some(q => q.lessonId === l.id)).length
  };

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-black">
            {editingQuiz ? 'Edit Quiz' : 'Create New Quiz'}
          </h2>
          <Button variant="outline" onClick={resetForm}>
            Cancel
          </Button>
        </div>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-black">Quiz Details</CardTitle>
            <CardDescription className="text-gray-600">
              {editingQuiz ? 'Update quiz information' : 'Enter quiz information'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lessonId" className="text-black">Lesson *</Label>
                  <select
                    id="lessonId"
                    name="lessonId"
                    value={formData.lessonId}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: 'white', color: 'black' }}
                    required
                  >
                    <option value="" style={{ backgroundColor: 'white', color: 'black' }}>Select a lesson</option>
                    {lessons.map((lesson: any) => (
                      <option key={lesson.id} value={lesson.id} style={{ backgroundColor: 'white', color: 'black' }}>
                        {lesson.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-black">Quiz Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleFormChange}
                    placeholder="Enter quiz title"
                    style={{ backgroundColor: 'white', color: 'black' }}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-black">Description (optional)</Label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  className="w-full border rounded p-2"
                  style={{ backgroundColor: 'white', color: 'black' }}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {editingQuiz ? 'Update Quiz' : 'Create Quiz'}
                </Button>
              </div>
              {error && <div className="text-red-600">{error}</div>}
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">Quizzes Management</h1>
          <p className="text-gray-600">
            Manage all quizzes and assessments linked to lessons.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Icons.Plus />
          Add New Quiz
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Icons.Quiz />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Quizzes</p>
                <p className="text-2xl font-bold text-black">{stats.totalQuizzes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Icons.Quiz />
              <div>
                <p className="text-sm font-medium text-gray-600">Lessons with Quizzes</p>
                <p className="text-2xl font-bold text-black">{stats.lessonsWithQuizzes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Icons.Filter />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Lessons</p>
                <p className="text-2xl font-bold text-black">{lessons.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Icons.Quiz />
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Quizzes/Lesson</p>
                <p className="text-2xl font-bold text-black">{lessons.length ? (stats.totalQuizzes / lessons.length).toFixed(2) : 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
              <Label htmlFor="filter-lesson" className="text-black">Lesson</Label>
              <select
                id="filter-lesson"
                value={filterLesson}
                onChange={e => { setFilterLesson(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: 'white', color: 'black' }}
              >
                <option value="" style={{ backgroundColor: 'white', color: 'black' }}>All Lessons</option>
                {lessons.map((lesson: any) => (
                  <option key={lesson.id} value={lesson.id} style={{ backgroundColor: 'white', color: 'black' }}>
                    {lesson.title}
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
                  value={search}
                  onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                  placeholder="Search quizzes by title..."
                  className="pl-10 bg-white text-black"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Icons.Quiz />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quizzes List */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-black">Quizzes</CardTitle>
          <CardDescription className="text-gray-600">
            Manage quiz content and organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading quizzes...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium text-black">Quiz Details</th>
                    <th className="text-left p-4 font-medium text-black">Lesson</th>
                    <th className="text-left p-4 font-medium text-black">Created</th>
                    <th className="text-left p-4 font-medium text-black">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedQuizzes.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-gray-600">
                        No quizzes found.
                      </td>
                    </tr>
                  ) : (
                    paginatedQuizzes.map((quiz) => (
                      <tr key={quiz.id} className="border-b hover:bg-gray-50">
                        <td className="p-4">
                          <div>
                            <div className="font-medium text-black flex items-center space-x-2">
                              <Icons.Quiz />
                              <span>{quiz.title}</span>
                            </div>
                            <div className="text-sm text-gray-600 truncate max-w-xs">
                              {quiz.description}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-black">{lessons.find(l => l.id === quiz.lessonId)?.title || quiz.lessonId}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-gray-600">
                            {quiz.createdAt ? new Date(quiz.createdAt).toLocaleDateString() : ''}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(quiz)}
                            >
                              <Icons.Edit />
                              <span className="ml-1">Edit</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(quiz)}
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
