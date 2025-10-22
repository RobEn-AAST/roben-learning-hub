"use client";


import React, { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { quizService, Quiz, QuestionOption, QuizQuestion } from "@/services/quizService";
import { useQuizQuestions, useQuestionQuizzes, useQuestionStats } from '@/hooks/useQueryCache';
import { toast } from 'sonner';

// Icons (copied from QuizAdminDashboard for visual match)
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



export default function QuizQuestionAdminDashboard() {
  // PERFORMANCE: React Query hooks - instant revisits from cache
  const { data: questions = [], isLoading: questionsLoading } = useQuizQuestions();
  const { data: quizzes = [], isLoading: quizzesLoading } = useQuestionQuizzes();
  const { data: stats, isLoading: statsLoading } = useQuestionStats();
  
  const loading = questionsLoading || quizzesLoading || statsLoading;
  
  const [filterQuiz, setFilterQuiz] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [formData, setFormData] = useState({ quizId: "", text: "", type: "multiple_choice" });
  const [error, setError] = useState("");

  // Inline option creation states
  const [showOptionForm, setShowOptionForm] = useState(false);
  const [currentQuestionId, setCurrentQuestionId] = useState<string>('');
  const [optionFormData, setOptionFormData] = useState({
    text: '',
    isCorrect: false
  });
  const [options, setOptions] = useState<any[]>([]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    try {
      let question;
      if (editingQuestion) {
        // Update existing question
        console.log('Updating question with data:', formData);
        const response = await fetch(`/api/admin/quiz-questions/${editingQuestion.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: formData.text,
            type: formData.type
          }),
        });
        
        if (response.ok) {
          question = await response.json();
          console.log('Question update result:', question);
          // Close form after successful update
          resetForm();
        } else {
          const errorData = await response.json();
          console.error('Question update failed:', errorData);
          throw new Error(errorData.error || 'Failed to update question');
        }
      } else {
        // Create new question
        console.log('Creating question with data:', formData);
        const response = await fetch('/api/admin/quiz-questions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            quizId: formData.quizId,
            text: formData.text,
            type: formData.type
          }),
        });
        
        if (response.ok) {
          question = await response.json();
          console.log('Question creation result:', question);
          setCurrentQuestionId(question.id);
          
          // If it's a true_false question, automatically create True and False options
          if (formData.type === 'true_false') {
            await createTrueFalseOptions(question.id);
          }
          
          // Don't close the form, just enable option creation
        } else {
          const errorData = await response.json();
          console.error('Question creation failed:', errorData);
          throw new Error(errorData.error || 'Failed to create question');
        }
      }
      
      if (question) {
        setError('');
        toast.success(editingQuestion ? 'Question updated successfully!' : 'Question created successfully!');
        // PERFORMANCE: React Query auto-refetches - no manual reload needed
      } else {
        setError('Failed to process question - check console for details');
        toast.error('Failed to process question');
      }
    } catch (e: any) {
      setError(e.message || "Failed to process question");
    }
  };

  // Auto-create True/False options for true_false questions
  const createTrueFalseOptions = async (questionId: string) => {
    try {
      // Create True option
      await fetch('/api/admin/question-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          content: 'True',
          isCorrect: false, // Default to false, admin can change later
          position: 1
        }),
      });

      // Create False option
      await fetch('/api/admin/question-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          content: 'False',
          isCorrect: true, // Default to false being correct
          position: 2
        }),
      });
      
      console.log('True/False options created for question:', questionId);
    } catch (error) {
      console.error('Error creating true/false options:', error);
    }
  };

  // Handlers for inline option creation
  const handleOptionFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setOptionFormData({ ...optionFormData, [name]: (e.target as HTMLInputElement).checked });
    } else {
      setOptionFormData({ ...optionFormData, [name]: value });
    }
  };

  const handleOptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestionId) return;
    
    try {
      const response = await fetch('/api/admin/question-options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId: currentQuestionId,
          text: optionFormData.text,
          isCorrect: optionFormData.isCorrect
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create option');
      }
      
      const option = await response.json();
      setOptionFormData({ text: '', isCorrect: false });
      
      // Refresh options data
      const optionsResponse = await fetch('/api/admin/question-options');
      if (optionsResponse.ok) {
        const optionsData = await optionsResponse.json();
        setOptions(optionsData.filter((o: any) => o.questionId === currentQuestionId));
      }
    } catch (e: any) {
      setError(e.message || 'Failed to create option');
    }
  };

  const handleEdit = (question: QuizQuestion) => {
    setEditingQuestion(question);
    setFormData({
      quizId: question.quizId,
      text: question.text,
      type: question.type
    });
    setShowForm(true);
  };

  const handleDelete = async (question: QuizQuestion) => {
    if (!confirm(`Are you sure you want to delete the question "${question.text.substring(0, 50)}..."? This action cannot be undone and will also delete all associated answer options.`)) {
      return;
    }

    setError('');
    
    try {
      console.log('Deleting question:', question.id);
      const response = await fetch(`/api/admin/quiz-questions/${question.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        console.log('Question deleted successfully');
        toast.success('Question deleted successfully!');
        // PERFORMANCE: React Query auto-refetches - no manual reload needed
      } else {
        const errorData = await response.json();
        console.error('Question deletion failed:', errorData);
        const errorMsg = errorData.error || 'Failed to delete question';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      setError('Failed to delete question');
    }
  };

  const resetForm = () => {
    setFormData({ quizId: "", text: "", type: "multiple_choice" });
    setEditingQuestion(null);
    setShowForm(false);
    setShowOptionForm(false);
    setCurrentQuestionId('');
    setOptionFormData({ text: '', isCorrect: false });
    setOptions([]);
  };

  // Filtered and searched questions
  const filteredQuestions = questions.filter((q: QuizQuestion) => {
    const matchesQuiz = filterQuiz ? q.quizId === filterQuiz : true;
    const matchesSearch = search ? q.text.toLowerCase().includes(search.toLowerCase()) : true;
    return matchesQuiz && matchesSearch;
  });
  // Paginate client-side for demo
  const pageSize = 10;
  const paginatedQuestions = filteredQuestions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => {
    setTotalPages(Math.max(1, Math.ceil(filteredQuestions.length / pageSize)));
    if (currentPage > Math.ceil(filteredQuestions.length / pageSize)) setCurrentPage(1);
  }, [filteredQuestions.length]);

  // Calculate local stats from data
  const localStats = stats || {
    totalQuestions: questions.length,
    quizzesWithQuestions: quizzes.filter((qz: any) => questions.some((q: QuizQuestion) => q.quizId === qz.id)).length
  };

  // PERFORMANCE: Elegant loading skeleton while React Query fetches data
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>

        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {showForm ? (
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-black">
                {editingQuestion ? 'Edit Question' : 'Create New Question'}
              </h2>
            </div>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          </div>
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-black">Question Details</CardTitle>
              <CardDescription className="text-gray-600">
                {editingQuestion ? 'Update question information' : 'Enter question information for the selected quiz.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quizId" className="text-black font-semibold text-sm mb-2 block">Quiz *</Label>
                    <select
                      id="quizId"
                      name="quizId"
                      value={formData.quizId}
                      onChange={e => setFormData({ ...formData, quizId: e.target.value })}
                      className="w-full mt-2 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
                      required
                      disabled={editingQuestion ? true : false}
                    >
                      <option value="" style={{ backgroundColor: 'white', color: 'black' }}>Select a quiz</option>
                      {quizzes.map((quiz: any) => (
                        <option key={quiz.id} value={quiz.id} style={{ backgroundColor: 'white', color: 'black' }}>
                          {quiz.title}
                        </option>
                      ))}
                    </select>
                    {editingQuestion && (
                      <p className="text-sm text-gray-500 mt-1">
                        Quiz cannot be changed when editing a question
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="text" className="text-black font-semibold text-sm mb-2 block">Question Text *</Label>
                    <Input
                      id="text"
                      name="text"
                      value={formData.text}
                      onChange={e => setFormData({ ...formData, text: e.target.value })}
                      placeholder="Enter question text"
                      className="mt-2"
                      style={{ backgroundColor: 'white', color: 'black' }}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type" className="text-black font-semibold text-sm mb-2 block">Type *</Label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="w-full mt-2 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
                    required
                  >
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="short_answer">Short Answer</option>
                    <option value="true_false">True/False</option>
                  </select>
                  {formData.type === 'true_false' && (
                    <p className="text-sm text-blue-600 mt-2 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      True and False options will be automatically created
                    </p>
                  )}
                </div>
                <div className="flex justify-end space-x-3 pt-6">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? (editingQuestion ? 'Updating...' : 'Creating...') : (editingQuestion ? 'Update Question' : 'Create Question')}
                  </Button>
                </div>
                {error && <div className="text-red-600">{error}</div>}
              </form>

              {/* Create Option Button - shown after question is created (not for true_false) */}
              {currentQuestionId && formData.type !== 'true_false' && (
                <div className="mt-6 pt-6 border-t">
                  <Button 
                    onClick={() => setShowOptionForm(true)}
                    variant="outline"
                    className="w-full"
                  >
                    <Icons.Plus />
                    Create Options for this Question
                  </Button>
                </div>
              )}
              
              {/* Show message for true_false questions */}
              {currentQuestionId && formData.type === 'true_false' && (
                <div className="mt-6 pt-6 border-t">
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-green-800 font-medium">True/False Options Created!</p>
                        <p className="text-green-700 text-sm">True and False options have been automatically created. You can edit which option is correct in the question list below.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Nested Option Form */}
              {showOptionForm && currentQuestionId && (
                <Card className="mt-4 bg-gray-50 border-2 border-green-200">
                  <CardHeader>
                    <CardTitle className="text-lg text-green-800">Create Option</CardTitle>
                    <CardDescription>Add an option to your question</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleOptionSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="optionText" className="text-black">Option Text *</Label>
                        <Input
                          id="optionText"
                          name="text"
                          value={optionFormData.text}
                          onChange={handleOptionFormChange}
                          placeholder="Enter option text"
                          style={{ backgroundColor: 'white', color: 'black' }}
                          required
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          id="isCorrect"
                          name="isCorrect"
                          type="checkbox"
                          checked={optionFormData.isCorrect}
                          onChange={handleOptionFormChange}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="isCorrect" className="text-black">This is the correct answer</Label>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setShowOptionForm(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Create Option</Button>
                      </div>
                    </form>

                    {/* Display created options */}
                    {options.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-semibold text-black mb-2">Created Options:</h4>
                        <div className="space-y-2">
                          {options.map((option, index) => (
                            <div key={option.id} className="flex items-center justify-between p-2 bg-white rounded border">
                              <span className="text-black">{option.text}</span>
                              {option.isCorrect && <Badge variant="secondary" className="bg-green-100 text-green-800">Correct</Badge>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-black">Quiz Questions Management</h1>
              <p className="text-gray-600">
                Manage all quiz questions linked to quizzes.
              </p>
            </div>
            <Button onClick={() => setShowForm(true)}>
              <Icons.Plus />
              Add New Question
            </Button>
          </div>

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <Icons.Quiz />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Questions</p>
                    <p className="text-2xl font-bold text-black">{localStats.totalQuestions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <Icons.Quiz />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Quizzes with Questions</p>
                    <p className="text-2xl font-bold text-black">{localStats.quizzesWithQuestions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <Icons.Filter />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Quizzes</p>
                    <p className="text-2xl font-bold text-black">{quizzes.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <Icons.Quiz />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Questions/Quiz</p>
                    <p className="text-2xl font-bold text-black">{quizzes.length ? (localStats.totalQuestions / quizzes.length).toFixed(2) : 0}</p>
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
                  <Label htmlFor="filter-quiz" className="text-black">Quiz</Label>
                  <select
                    id="filter-quiz"
                    value={filterQuiz}
                    onChange={e => { setFilterQuiz(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: 'white', color: 'black' }}
                  >
                    <option value="" style={{ backgroundColor: 'white', color: 'black' }}>All Quizzes</option>
                    {quizzes.map((quiz: any) => (
                      <option key={quiz.id} value={quiz.id} style={{ backgroundColor: 'white', color: 'black' }}>
                        {quiz.title}
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
                      placeholder="Search questions by text..."
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

          {/* Questions List */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-black">Questions</CardTitle>
              <CardDescription className="text-gray-600">
                Manage quiz questions and their organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Loading questions...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 font-medium text-black">Question Details</th>
                        <th className="text-left p-4 font-medium text-black">Quiz</th>
                        <th className="text-left p-4 font-medium text-black">Type</th>
                        <th className="text-left p-4 font-medium text-black">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedQuestions.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-8 text-gray-600">
                            No questions found.
                          </td>
                        </tr>
                      ) : (
                        paginatedQuestions.map((question: QuizQuestion) => (
                          <tr key={question.id} className="border-b hover:bg-gray-50">
                            <td className="p-4">
                              <div>
                                <div className="font-medium text-black flex items-center space-x-2">
                                  <Icons.Quiz />
                                  <span>{question.text}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="font-medium text-black">{quizzes.find((q: any) => q.id === question.quizId)?.title || question.quizId}</div>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col space-y-1">
                                <Badge className={`${
                                  question.type === 'multiple_choice' 
                                    ? 'bg-blue-100 text-blue-800 border-blue-300' 
                                    : question.type === 'true_false' 
                                      ? 'bg-green-100 text-green-800 border-green-300' 
                                      : 'bg-purple-100 text-purple-800 border-purple-300'
                                }`}>
                                  {question.type === 'multiple_choice' && 'Multiple Choice'}
                                  {question.type === 'short_answer' && 'Short Answer'}
                                  {question.type === 'true_false' && 'True/False'}
                                </Badge>
                                {question.type === 'true_false' && (
                                  <span className="text-xs text-green-600 flex items-center">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Auto options
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(question)}
                                >
                                  <Icons.Edit />
                                  <span className="ml-1">Edit</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(question)}
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
        </>
      )}
    </div>
  );
}
