"use client";


import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QuestionOption } from "@/services/quizService";

const Icons = {
  Option: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12l2 2 4-4" />
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
};


export default function QuestionOptionAdminDashboard() {
  const [options, setOptions] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit'>("list");
  const [formData, setFormData] = useState({ questionId: "", text: "", isCorrect: false });
  const [error, setError] = useState("");
  const [editingOption, setEditingOption] = useState<any | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [optionsResponse, questionsResponse] = await Promise.all([
        fetch('/api/admin/question-options'),
        fetch('/api/admin/quiz-questions')
      ]);
      
      if (!optionsResponse.ok || !questionsResponse.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const [optionsData, questionsData] = await Promise.all([
        optionsResponse.json(),
        questionsResponse.json()
      ]);
      
      setOptions(optionsData);
      setQuestions(questionsData);
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: (e.target as HTMLInputElement).checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Frontend validation: Check if trying to set as correct when another option is already correct
      if (formData.isCorrect) {
        const questionId = editingOption ? editingOption.questionId : formData.questionId;
        const existingCorrectOption = options.find(option => 
          option.questionId === questionId && 
          option.isCorrect && 
          option.id !== (editingOption?.id || '')
        );
        
        if (existingCorrectOption) {
          setError('Another option is already marked as correct for this question. Only one correct answer is allowed per question.');
          setLoading(false);
          return;
        }
      }

      let option;
      if (editingOption) {
        // Update existing option
        console.log('Updating option with data:', formData);
        const response = await fetch(`/api/admin/question-options/${editingOption.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: formData.text,
            isCorrect: formData.isCorrect
          })
        });
        
        if (response.ok) {
          option = await response.json();
          console.log('Option update result:', option);
        } else {
          console.log('Update response status:', response.status);
          console.log('Update response statusText:', response.statusText);
          
          let errorData;
          let responseText;
          try {
            responseText = await response.text();
            console.log('Update raw response:', responseText);
            errorData = JSON.parse(responseText);
            console.error('Option update failed:', errorData);
          } catch (parseError) {
            console.error('Failed to parse update error response:', parseError);
            console.error('Update raw response text:', responseText);
            throw new Error(`Failed to update option (HTTP ${response.status}): ${responseText || 'Unknown error'}`);
          }
          
          throw new Error(errorData.error || `Failed to update option (HTTP ${response.status})`);
        }
      } else {
        // Create new option
        console.log('Creating option with data:', formData);
        const response = await fetch('/api/admin/question-options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionId: formData.questionId,
            text: formData.text,
            isCorrect: formData.isCorrect
          })
        });
        
        if (response.ok) {
          option = await response.json();
          console.log('Option creation result:', option);
        } else {
          console.log('Response status:', response.status);
          console.log('Response statusText:', response.statusText);
          
          let errorData;
          let responseText;
          try {
            responseText = await response.text();
            console.log('Raw response:', responseText);
            errorData = JSON.parse(responseText);
            console.error('Option creation failed:', errorData);
          } catch (parseError) {
            console.error('Failed to parse error response:', parseError);
            console.error('Raw response text:', responseText);
            throw new Error(`Failed to create option (HTTP ${response.status}): ${responseText || 'Unknown error'}`);
          }
          
          throw new Error(errorData.error || `Failed to create option (HTTP ${response.status})`);
        }
      }
      
      if (option) {
        setFormData({ questionId: "", text: "", isCorrect: false });
        setEditingOption(null);
        setViewMode('list');
        await loadInitialData();
      }
    } catch (error: any) {
      console.error('Error processing option:', error);
      setError(error.message || "Failed to save option");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (option: any) => {
    setEditingOption(option);
    setFormData({
      questionId: option.questionId,
      text: option.text,
      isCorrect: option.isCorrect
    });
    setViewMode('edit');
  };

  const handleDelete = async (option: any) => {
    if (!confirm(`Are you sure you want to delete the option "${option.text}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      console.log('Deleting option:', option.id);
      const response = await fetch(`/api/admin/question-options/${option.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        console.log('Option deleted successfully');
        await loadInitialData(); // Refresh the list
      } else {
        const errorData = await response.json();
        console.error('Option deletion failed:', errorData);
        setError(errorData.error || 'Failed to delete option');
      }
    } catch (error) {
      console.error('Error deleting option:', error);
      setError('Failed to delete option');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ questionId: "", text: "", isCorrect: false });
    setEditingOption(null);
    setViewMode('list');
  };


  // Filters and pagination
  const [filterQuestion, setFilterQuestion] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const filteredOptions = options.filter(o => {
    const matchesQuestion = filterQuestion ? o.questionId === filterQuestion : true;
    const matchesSearch = search ? o.text.toLowerCase().includes(search.toLowerCase()) : true;
    return matchesQuestion && matchesSearch;
  });
  const pageSize = 10;
  const paginatedOptions = filteredOptions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  React.useEffect(() => {
    setTotalPages(Math.max(1, Math.ceil(filteredOptions.length / pageSize)));
    if (currentPage > Math.ceil(filteredOptions.length / pageSize)) setCurrentPage(1);
  }, [filteredOptions.length]);

  // Stats
  const stats = {
    totalOptions: options.length,
    questionsWithOptions: questions.filter(q => options.some(o => o.questionId === q.id)).length
  };


  return (
    <div className="p-6">
      {(viewMode === 'create' || viewMode === 'edit') ? (
        <>
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">{viewMode === 'edit' ? 'Edit Option' : 'Create New Option'}</h1>
            <p className="text-gray-600">
              {viewMode === 'edit' ? 'Update the option information below' : 'Fill in the details to create a new option'}
            </p>
          </div>
          <Card className="bg-white">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <Label htmlFor="questionId" className="text-black font-semibold text-sm mb-2 block">Question *</Label>
                    <select
                      id="questionId"
                      name="questionId"
                      value={formData.questionId}
                      onChange={e => setFormData({ ...formData, questionId: e.target.value })}
                      className="w-full mt-2 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
                      required
                      disabled={editingOption ? true : false}
                    >
                      <option value="">Select a question</option>
                      {questions.map((question) => (
                        <option key={question.id} value={question.id}>
                          {question.text}
                        </option>
                      ))}
                    </select>
                    {editingOption && (
                      <p className="text-sm text-gray-500 mt-1">
                        Question cannot be changed when editing an option
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="text" className="text-black font-semibold text-sm mb-2 block">Option Text *</Label>
                    <Input
                      id="text"
                      name="text"
                      value={formData.text}
                      onChange={e => setFormData({ ...formData, text: e.target.value })}
                      placeholder="Option text"
                      className="mt-2"
                      style={{ backgroundColor: 'white', color: 'black' }}
                      required
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center space-x-3">
                    <input
                      id="isCorrect"
                      name="isCorrect"
                      type="checkbox"
                      checked={formData.isCorrect}
                      onChange={e => setFormData({ ...formData, isCorrect: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <Label htmlFor="isCorrect" className="text-black font-semibold text-sm cursor-pointer">Is Correct?</Label>
                  </div>
                  {(() => {
                    const questionId = editingOption ? editingOption.questionId : formData.questionId;
                    const existingCorrectOption = questionId ? options.find(option => 
                      option.questionId === questionId && 
                      option.isCorrect && 
                      option.id !== (editingOption?.id || '')
                    ) : null;
                    
                    return existingCorrectOption ? (
                      <p className="text-sm text-amber-600 mt-1 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Warning: Another option is already marked as correct for this question
                      </p>
                    ) : null;
                  })()}
                </div>
                <div className="flex justify-end space-x-3 pt-6">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    <Icons.Cancel />
                    <span className="ml-2">Cancel</span>
                  </Button>
                  <Button type="submit">
                    <Icons.Save />
                    <span className="ml-2">{viewMode === 'edit' ? 'Update' : 'Create'} Option</span>
                  </Button>
                </div>
                {error && <div className="text-red-600">{error}</div>}
              </form>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold">Question Option Management</h1>
                <p className="text-gray-600 mt-2">Manage all options for quiz questions</p>
              </div>
              <Button onClick={() => setViewMode('create')} className="flex items-center space-x-2">
                <Icons.Plus />
                <span>Add Option</span>
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <Icons.Option />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Options</p>
                    <p className="text-2xl font-bold text-black">{options.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <Icons.Option />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Questions with Options</p>
                    <p className="text-2xl font-bold text-black">{questions.filter(q => options.some(o => o.questionId === q.id)).length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card className="bg-white mb-8">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                      <Icons.Option />
                    </div>
                    <Input
                      placeholder="Search options..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-10 w-full sm:w-64"
                      style={{ backgroundColor: 'white', color: 'black' }}
                    />
                  </div>
                  <select
                    value={filterQuestion}
                    onChange={e => setFilterQuestion(e.target.value)}
                    className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
                  >
                    <option value="">All Questions</option>
                    {questions.map((question) => (
                      <option key={question.id} value={question.id}>{question.text}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Options Table */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-black">Options</CardTitle>
              <CardDescription className="text-gray-600">
                Manage question options and their organization
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium text-black">Option Text</th>
                      <th className="text-left p-4 font-medium text-black">Question</th>
                      <th className="text-left p-4 font-medium text-black">Is Correct</th>
                      <th className="text-left p-4 font-medium text-black">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOptions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-gray-600">
                          No options found.
                        </td>
                      </tr>
                    ) : (
                      paginatedOptions.map((option) => (
                        <tr key={option.id} className="border-b hover:bg-gray-50">
                          <td className="p-4">
                            <div className="font-medium text-black flex items-center space-x-2">
                              <Icons.Option />
                              <span>{option.text}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="font-medium text-black">{questions.find(q => q.id === option.questionId)?.text || option.questionId}</div>
                          </td>
                          <td className="p-4">
                            <Badge className={option.isCorrect ? "bg-green-100 text-green-800 border-green-300" : "bg-gray-100 text-gray-800 border-gray-300"}>{option.isCorrect ? 'Yes' : 'No'}</Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(option)}
                              >
                                <Icons.Edit />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(option)}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <Icons.Delete />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
             
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
