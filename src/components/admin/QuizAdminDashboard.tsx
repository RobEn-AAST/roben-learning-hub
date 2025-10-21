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
    description: '',
    timeLimitMinutes: ''
  });
  const [filterLesson, setFilterLesson] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Workflow state management
  const [workflowStep, setWorkflowStep] = useState<'quiz' | 'question' | 'option'>('quiz');
  const [currentQuizId, setCurrentQuizId] = useState<string>('');
  const [currentQuestionId, setCurrentQuestionId] = useState<string>('');
  const [questionFormData, setQuestionFormData] = useState({
    text: '',
    type: 'multiple_choice'
  });
  const [optionFormData, setOptionFormData] = useState({
    text: '',
    isCorrect: false
  });
  const [questions, setQuestions] = useState<any[]>([]);
  const [options, setOptions] = useState<any[]>([]);


  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [quizzesResponse, lessonsResponse] = await Promise.all([
        fetch('/api/admin/quizzes'),
        // Use quiz service for lessons since there's no lessons API endpoint yet
        quizService.getLessons()
      ]);
      
      if (!quizzesResponse.ok) {
        throw new Error('Failed to fetch quizzes');
      }
      
      const [quizzesData, lessonsData] = await Promise.all([
        quizzesResponse.json(),
        lessonsResponse
      ]);
      
      setQuizzes(quizzesData);
      setLessons(lessonsData);
    } catch (e) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Get lessons that don't have quizzes yet (for creating new quiz)
  // When editing, include the current lesson
  const availableLessons = lessons.filter(lesson => 
    !quizzes.some(quiz => quiz.lessonId === lesson.id) ||
    (editingQuiz && lesson.id === editingQuiz.lessonId)
  );

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
        // Update existing quiz
        console.log('Updating quiz with data:', formData);
        const response = await fetch(`/api/admin/quizzes/${editingQuiz.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            timeLimitMinutes: formData.timeLimitMinutes ? parseInt(formData.timeLimitMinutes) : null
          })
        });
        
        if (response.ok) {
          quiz = await response.json();
          console.log('Quiz update result:', quiz);
          // Close form after successful update
          resetForm();
        } else {
          const errorData = await response.json();
          console.error('Quiz update failed:', errorData);
          throw new Error(errorData.error || 'Failed to update quiz');
        }
      } else {
        // Create new quiz
        console.log('Creating quiz with data:', formData);
        const response = await fetch('/api/admin/quizzes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lessonId: formData.lessonId,
            title: formData.title,
            description: formData.description,
            timeLimitMinutes: formData.timeLimitMinutes ? parseInt(formData.timeLimitMinutes) : null
          })
        });
        
        if (response.ok) {
          quiz = await response.json();
          console.log('Quiz creation result:', quiz);
          setCurrentQuizId(quiz.id);
          // Don't close the form, just show success and enable question creation
        } else {
          const errorData = await response.json();
          console.error('Quiz creation failed:', errorData);
          throw new Error(errorData.error || 'Failed to create quiz');
        }
      }
      
      if (quiz) {
        setError('');
        await loadInitialData();
      } else {
        setError('Failed to process quiz - check console for details');
      }
    } catch (e) {
      console.error('Quiz creation error:', e);
      setError(`Failed to create quiz: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setFormData({
      lessonId: quiz.lessonId,
      title: quiz.title,
      description: quiz.description || '',
      timeLimitMinutes: quiz.timeLimitMinutes ? quiz.timeLimitMinutes.toString() : ''
    });
    setShowForm(true);
  };

  const handleDelete = async (quiz: Quiz) => {
    if (!confirm(`Are you sure you want to delete the quiz "${quiz.title}"? This action cannot be undone and will also delete all associated questions and answers.`)) {
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      console.log('Deleting quiz:', quiz.id);
      const response = await fetch(`/api/admin/quizzes/${quiz.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        console.log('Quiz deleted successfully');
        await loadInitialData(); // Refresh the list
      } else {
        const errorData = await response.json();
        console.error('Quiz deletion failed:', errorData);
        setError(errorData.error || 'Failed to delete quiz');
      }
    } catch (error) {
      console.error('Error deleting quiz:', error);
      setError('Failed to delete quiz');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ lessonId: '', title: '', description: '', timeLimitMinutes: '' });
    setEditingQuiz(null);
    setShowForm(false);
    setWorkflowStep('quiz');
    setCurrentQuizId('');
    setCurrentQuestionId('');
    setQuestionFormData({ text: '', type: 'multiple_choice' });
    setOptionFormData({ text: '', isCorrect: false });
  };

  // Workflow navigation functions
  const goToQuestionStep = () => {
    setWorkflowStep('question');
  };

  const goToOptionStep = () => {
    setWorkflowStep('option');
  };

  const goBackToQuizStep = () => {
    setWorkflowStep('quiz');
  };

  const goBackToQuestionStep = () => {
    setWorkflowStep('question');
  };

  // Handlers for nested forms
  const handleQuestionFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setQuestionFormData({ ...questionFormData, [e.target.name]: e.target.value });
  };

  const handleOptionFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setOptionFormData({ ...optionFormData, [name]: (e.target as HTMLInputElement).checked });
    } else {
      setOptionFormData({ ...optionFormData, [name]: value });
    }
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuizId) return;
    
    try {
      const response = await fetch('/api/admin/quiz-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: currentQuizId,
          text: questionFormData.text,
          type: questionFormData.type
        })
      });

      if (response.ok) {
        const question = await response.json();
        setCurrentQuestionId(question.id);
        setQuestionFormData({ text: '', type: 'multiple_choice' });
        
        // Load questions for display
        const questionsResponse = await fetch('/api/admin/quiz-questions');
        if (questionsResponse.ok) {
          const questionsData = await questionsResponse.json();
          setQuestions(questionsData.filter((q: any) => q.quizId === currentQuizId));
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create question');
      }
    } catch (error) {
      console.error('Error creating question:', error);
      setError('Failed to create question');
    }
  };

  const handleOptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestionId) return;
    
    try {
      const response = await fetch('/api/admin/question-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestionId,
          text: optionFormData.text,
          isCorrect: optionFormData.isCorrect
        })
      });

      if (response.ok) {
        const option = await response.json();
        setOptionFormData({ text: '', isCorrect: false });
        
        // Load options for display
        const optionsResponse = await fetch('/api/admin/question-options');
        if (optionsResponse.ok) {
          const optionsData = await optionsResponse.json();
          setOptions(optionsData.filter((o: any) => o.questionId === currentQuestionId));
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create option');
      }
    } catch (error) {
      console.error('Error creating option:', error);
      setError('Failed to create option');
    }
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
        {/* Step-by-step workflow header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-black">
              {workflowStep === 'quiz' && (editingQuiz ? 'Edit Quiz' : 'Create New Quiz')}
              {workflowStep === 'question' && 'Create Question'}
              {workflowStep === 'option' && 'Create Option'}
            </h2>
            <div className="flex items-center space-x-2 mt-2">
              <span className={`px-2 py-1 rounded text-xs ${workflowStep === 'quiz' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                1. Quiz
              </span>
              <span className="text-gray-400">→</span>
              <span className={`px-2 py-1 rounded text-xs ${workflowStep === 'question' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                2. Questions
              </span>
              <span className="text-gray-400">→</span>
              <span className={`px-2 py-1 rounded text-xs ${workflowStep === 'option' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                3. Options
              </span>
            </div>
          </div>
          <div className="flex space-x-2">
            {workflowStep === 'question' && (
              <Button variant="outline" onClick={goBackToQuizStep}>
                ← Back to Quiz
              </Button>
            )}
            {workflowStep === 'option' && (
              <Button variant="outline" onClick={goBackToQuestionStep}>
                ← Back to Question
              </Button>
            )}
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>

        {/* STEP 1: Quiz Creation/Editing */}
        {workflowStep === 'quiz' && (
          <>
            {availableLessons.length === 0 && !editingQuiz && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      No Available Lessons
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>All lessons already have quizzes. Each lesson can only have one quiz.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-black">Quiz Details</CardTitle>
            <CardDescription className="text-gray-600">
              {editingQuiz ? 'Update quiz information' : 'Enter quiz information. Note: Each lesson can only have one quiz.'}
            </CardDescription>
          </CardHeader>
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
                    disabled={editingQuiz ? true : false}
                  >
                    <option value="" style={{ backgroundColor: 'white', color: 'black' }}>Select a lesson</option>
                    {availableLessons.map((lesson: any) => (
                      <option key={lesson.id} value={lesson.id} style={{ backgroundColor: 'white', color: 'black' }}>
                        {lesson.title}
                      </option>
                    ))}
                    {availableLessons.length === 0 && !editingQuiz && (
                      <option disabled style={{ backgroundColor: 'white', color: 'gray' }}>
                        No lessons available (all lessons already have quizzes)
                      </option>
                    )}
                  </select>
                  {editingQuiz && (
                    <p className="text-sm text-gray-500 mt-1">
                      Lesson cannot be changed when editing a quiz
                    </p>
                  )}
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
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeLimitMinutes" className="text-black">Time Limit (minutes) - Optional</Label>
                <Input
                  id="timeLimitMinutes"
                  name="timeLimitMinutes"
                  type="number"
                  min="0"
                  value={formData.timeLimitMinutes}
                  onChange={handleFormChange}
                  placeholder="Leave empty for no time limit"
                  style={{ backgroundColor: 'white', color: 'black' }}
                />
                <p className="text-sm text-gray-500">
                  Set a time limit in minutes. Leave empty for unlimited time. Common values: 15, 30, 60 minutes.
                </p>
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

            {/* Create Question Button - shown after quiz is created */}
            {currentQuizId && (
              <div className="mt-6 pt-6 border-t">
                <Button 
                  onClick={goToQuestionStep}
                  variant="outline"
                  className="w-full"
                >
                  <Icons.Plus />
                  Create Question for this Quiz
                </Button>
              </div>
            )}

          </Card>
          </>   
        )}

        {/* STEP 2: Question Creation */}
        {workflowStep === 'question' && currentQuizId && (
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-black">Question Details</CardTitle>
              <CardDescription className="text-gray-600">
                Add a questions to your quiz
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleQuestionSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="questionText" className="text-black font-semibold text-sm mb-2 block">Question Text *</Label>
                  <textarea
                    id="questionText"
                    name="text"
                    value={questionFormData.text}
                    onChange={handleQuestionFormChange}
                    className="w-full mt-2 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
                    rows={4}
                    placeholder="Enter your question"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="questionType" className="text-black font-semibold text-sm mb-2 block">Question Type *</Label>
                  <select
                    id="questionType"
                    name="type"
                    value={questionFormData.type}
                    onChange={handleQuestionFormChange}
                    className="w-full mt-2 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
                    required
                  >
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="short_answer">Short Answer</option>
                    <option value="true_false">True/False</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3 pt-6">
                  <Button type="button" variant="outline" onClick={goBackToQuizStep}>
                    Back to Quiz
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Question'}
                  </Button>
                </div>
                {error && <div className="text-red-600">{error}</div>}
              </form>

              {/* Create Option Button - shown after question is created */}
              {currentQuestionId && (
                <div className="mt-6 pt-6 border-t">
                  <Button 
                    onClick={goToOptionStep}
                    variant="outline"
                    className="w-full"
                  >
                    <Icons.Plus />
                    Create Options for this Question
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* STEP 3: Option Creation */}
        {workflowStep === 'option' && currentQuestionId && (
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-black">Option Details</CardTitle>
              <CardDescription className="text-gray-600">
                Add answer options to your question
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleOptionSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="optionText" className="text-black font-semibold text-sm mb-2 block">Option Text *</Label>
                  <Input
                    id="optionText"
                    name="text"
                    value={optionFormData.text}
                    onChange={handleOptionFormChange}
                    placeholder="Enter option text"
                    className="mt-2"
                    style={{ backgroundColor: 'white', color: 'black' }}
                    required
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    id="isCorrect"
                    name="isCorrect"
                    type="checkbox"
                    checked={optionFormData.isCorrect}
                    onChange={handleOptionFormChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <Label htmlFor="isCorrect" className="text-black font-semibold text-sm cursor-pointer">Is Correct Answer?</Label>
                </div>
                <div className="flex justify-end space-x-3 pt-6">
                  <Button type="button" variant="outline" onClick={goBackToQuestionStep}>
                    Back to Question
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Option'}
                  </Button>
                </div>
                {error && <div className="text-red-600">{error}</div>}
              </form>

              {/* Add Another Option Button */}
              <div className="mt-6 pt-6 border-t flex justify-center space-x-4">
                <Button 
                  onClick={() => {
                    setOptionFormData({ text: '', isCorrect: false });
                    setError('');
                  }}
                  variant="outline"
                >
                  Add Another Option
                </Button>
                <Button 
                  onClick={goBackToQuestionStep}
                  variant="default"
                >
                  Finish & Create Another Question
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
