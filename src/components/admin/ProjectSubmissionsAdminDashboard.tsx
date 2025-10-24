'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { ProjectSubmission } from '@/types/submission';
import { PLATFORM_NAMES } from '@/types/submission';
import { activityLogService } from '@/services/activityLogService';

type ViewMode = 'list' | 'view' | 'edit';

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
  Link: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
  Search: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Check: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  X: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Save: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  ),
  ChartBar: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
};

interface ExtendedSubmission extends ProjectSubmission {
  project_title?: string;
  student_name?: string;
  student_email?: string;
  lesson_title?: string;
  course_title?: string;
}

interface FormData {
  status: string;
  feedback: string;
  grade: string;
}

export default function ProjectSubmissionsAdminDashboard() {
  const [submissions, setSubmissions] = useState<ExtendedSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedSubmission, setSelectedSubmission] = useState<ExtendedSubmission | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formData, setFormData] = useState<FormData>({
    status: '',
    feedback: '',
    grade: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/submissions');
      if (!response.ok) throw new Error('Failed to fetch submissions');
      
      const data = await response.json();
      setSubmissions(data);
    } catch (error) {
      console.error('Error loading submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (submission: ExtendedSubmission) => {
    setSelectedSubmission(submission);
    setViewMode('view');
  };

  const handleEdit = (submission: ExtendedSubmission) => {
    setSelectedSubmission(submission);
    setFormData({
      status: submission.status,
      feedback: submission.feedback || '',
      grade: submission.grade?.toString() || ''
    });
    setViewMode('edit');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    const errors: Record<string, string> = {};
    
    if (formData.grade && (parseInt(formData.grade) < 0 || parseInt(formData.grade) > 100)) {
      errors.grade = 'Grade must be between 0 and 100';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const updateData: any = {
        status: formData.status,
        feedback: formData.feedback || null,
        grade: formData.grade ? parseInt(formData.grade) : null
      };

      const response = await fetch(`/api/submissions/${selectedSubmission.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) throw new Error('Failed to update submission');

      await loadData();
      handleCancelEdit();
      toast.success('Submission updated successfully!');
    } catch (error) {
      console.error('Error updating submission:', error);
      toast.error('Failed to update submission. Please try again.');
    }
  };

  const handleDelete = async (submission: ExtendedSubmission) => {
    if (!confirm(`Are you sure you want to delete this submission?`)) return;

    try {
      const response = await fetch(`/api/submissions/${submission.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete submission');

      await loadData();
      toast.success('Submission deleted successfully!');
    } catch (error) {
      console.error('Error deleting submission:', error);
      toast.error('Failed to delete submission. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setViewMode('list');
    setSelectedSubmission(null);
    setFormData({ status: '', feedback: '', grade: '' });
    setFormErrors({});
  };

  const handleQuickApprove = async (submission: ExtendedSubmission) => {
    if (!confirm(`Approve submission for "${submission.project_title}" by ${submission.student_name}?`)) return;

    try {
      const response = await fetch(`/api/submissions/${submission.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          grade: 100 // Auto-assign 100% on quick approve
        })
      });

      if (!response.ok) throw new Error('Failed to approve submission');

      await loadData();
      toast.success('✅ Submission approved! Student can now proceed to the next lesson.');
    } catch (error) {
      console.error('Error approving submission:', error);
      toast.error('Failed to approve submission. Please try again.');
    }
  };

  const handleQuickReject = async (submission: ExtendedSubmission) => {
    const feedback = prompt(`Reject submission for "${submission.project_title}"?\n\nPlease provide feedback for the student:`);
    
    if (feedback === null) return; // User cancelled
    
    if (!feedback.trim()) {
      toast.error('Please provide feedback when rejecting a submission');
      return;
    }

    try {
      const response = await fetch(`/api/submissions/${submission.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'resubmission_required',
          feedback: feedback.trim()
        })
      });

      if (!response.ok) throw new Error('Failed to reject submission');

      await loadData();
      toast.success('Submission marked for resubmission. Student has been notified.');
    } catch (error) {
      console.error('Error rejecting submission:', error);
      toast.error('Failed to reject submission. Please try again.');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      submitted: { color: 'bg-blue-100 text-blue-800', label: 'Submitted' },
      pending_review: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending Review' },
      reviewed: { color: 'bg-purple-100 text-purple-800', label: 'Reviewed' },
      approved: { color: 'bg-green-100 text-green-800', label: '✓ Approved' },
      rejected: { color: 'bg-red-100 text-red-800', label: '✗ Rejected' },
      resubmission_required: { color: 'bg-orange-100 text-orange-800', label: 'Resubmission Required' },
    };
    const config = statusConfig[status] || statusConfig.submitted;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const filteredSubmissions = submissions.filter(submission => {
    const matchesSearch = 
      submission.project_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.student_email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || submission.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: submissions.length,
    submitted: submissions.filter(s => s.status === 'submitted').length,
    pending_review: submissions.filter(s => s.status === 'pending_review').length,
    approved: submissions.filter(s => s.status === 'approved').length,
    rejected: submissions.filter(s => s.status === 'rejected').length,
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div>Loading submissions...</div>
        </div>
      </div>
    );
  }

  if (viewMode === 'view' && selectedSubmission) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">View Submission</h1>
          <Button variant="outline" onClick={() => setViewMode('list')}>
            ← Back to List
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{selectedSubmission.project_title}</CardTitle>
            <CardDescription>
              Submitted by {selectedSubmission.student_name} ({selectedSubmission.student_email})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-600">Status</Label>
                <div className="mt-1">{getStatusBadge(selectedSubmission.status)}</div>
              </div>
              <div>
                <Label className="text-gray-600">Platform</Label>
                <div className="mt-1">
                  <Badge variant="outline">
                    {PLATFORM_NAMES[selectedSubmission.submission_platform]}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-gray-600">Grade</Label>
                <div className="mt-1 text-lg font-semibold">
                  {selectedSubmission.grade !== null ? `${selectedSubmission.grade}/100` : 'Not graded'}
                </div>
              </div>
              <div>
                <Label className="text-gray-600">Submitted At</Label>
                <div className="mt-1">{new Date(selectedSubmission.submitted_at).toLocaleString()}</div>
              </div>
            </div>

            <div>
              <Label className="text-gray-600">Submission Link</Label>
              <div className="mt-1">
                <a 
                  href={selectedSubmission.submission_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-2"
                >
                  <Icons.Link />
                  {selectedSubmission.submission_link}
                </a>
              </div>
            </div>

            {selectedSubmission.feedback && (
              <div>
                <Label className="text-gray-600">Instructor Feedback</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                  {selectedSubmission.feedback}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button onClick={() => handleEdit(selectedSubmission)}>
                <Icons.Edit />
                <span className="ml-2">Edit / Review</span>
              </Button>
              <Button variant="outline" onClick={() => setViewMode('list')}>
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (viewMode === 'edit' && selectedSubmission) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Review Submission</h1>
          <Button variant="outline" onClick={handleCancelEdit}>
            ← Back to List
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{selectedSubmission.project_title}</CardTitle>
            <CardDescription>
              Student: {selectedSubmission.student_name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label className="text-gray-600">Submission Link</Label>
                <a 
                  href={selectedSubmission.submission_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-2 mt-1"
                >
                  <Icons.Link />
                  {selectedSubmission.submission_link}
                </a>
              </div>

              <div>
                <Label htmlFor="status">Status *</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full mt-2 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-black"
                  required
                >
                  <option value="submitted">Submitted</option>
                  <option value="pending_review">Pending Review</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="resubmission_required">Resubmission Required</option>
                </select>
              </div>

              <div>
                <Label htmlFor="grade">Grade (0-100)</Label>
                <Input
                  id="grade"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  placeholder="Enter grade (optional)"
                  className="mt-2"
                />
                {formErrors.grade && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.grade}</p>
                )}
              </div>

              <div>
                <Label htmlFor="feedback">Feedback</Label>
                <textarea
                  id="feedback"
                  value={formData.feedback}
                  onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                  placeholder="Provide feedback to the student (optional)"
                  className="w-full mt-2 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-black"
                  rows={4}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-6">
                <Button type="button" variant="outline" onClick={handleCancelEdit}>
                  <Icons.X />
                  <span className="ml-2">Cancel</span>
                </Button>
                <Button type="submit">
                  <Icons.Save />
                  <span className="ml-2">Save Review</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Project Submissions</h1>
        <p className="text-gray-600">Review and manage student project submissions</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 mr-4">
                <Icons.ChartBar />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <h3 className="text-2xl font-bold">{stats.total}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 mr-4">
                <Icons.ChartBar />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <h3 className="text-2xl font-bold">{stats.pending_review}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 mr-4">
                <Icons.Check />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <h3 className="text-2xl font-bold">{stats.approved}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100 mr-4">
                <Icons.X />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <h3 className="text-2xl font-bold">{stats.rejected}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 mr-4">
                <Icons.ChartBar />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Submitted</p>
                <h3 className="text-2xl font-bold">{stats.submitted}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative mt-2">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Icons.Search />
                </div>
                <Input
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by project, student name, or email..."
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="statusFilter">Filter by Status</Label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full mt-2 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-black"
              >
                <option value="all">All Statuses</option>
                <option value="submitted">Submitted</option>
                <option value="pending_review">Pending Review</option>
                <option value="reviewed">Reviewed</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="resubmission_required">Resubmission Required</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Submissions ({filteredSubmissions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold">Project</th>
                  <th className="text-left p-3 font-semibold">Student</th>
                  <th className="text-left p-3 font-semibold">Platform</th>
                  <th className="text-left p-3 font-semibold">Status</th>
                  <th className="text-left p-3 font-semibold">Grade</th>
                  <th className="text-left p-3 font-semibold">Submitted</th>
                  <th className="text-right p-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-gray-500">
                      No submissions found
                    </td>
                  </tr>
                ) : (
                  filteredSubmissions.map((submission) => (
                    <tr key={submission.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-medium">{submission.project_title}</div>
                        <div className="text-sm text-gray-500">{submission.lesson_title}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{submission.student_name}</div>
                        <div className="text-sm text-gray-500">{submission.student_email}</div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">
                          {PLATFORM_NAMES[submission.submission_platform]}
                        </Badge>
                      </td>
                      <td className="p-3">{getStatusBadge(submission.status)}</td>
                      <td className="p-3">
                        {submission.grade !== null ? (
                          <span className="font-semibold">{submission.grade}/100</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {new Date(submission.submitted_at).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          {/* Quick Actions for pending submissions */}
                          {(submission.status === 'submitted' || submission.status === 'pending_review') && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleQuickApprove(submission)}
                                className="text-green-600 hover:bg-green-50 border-green-300"
                                title="Quick Approve (100%)"
                              >
                                <Icons.Check />
                                <span className="ml-1">Approve</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleQuickReject(submission)}
                                className="text-orange-600 hover:bg-orange-50 border-orange-300"
                                title="Request Resubmission"
                              >
                                <Icons.X />
                                <span className="ml-1">Reject</span>
                              </Button>
                            </>
                          )}
                          
                          {/* Standard Actions */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleView(submission)}
                            title="View Details"
                          >
                            <Icons.View />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(submission)}
                            title="Edit Submission"
                          >
                            <Icons.Edit />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(submission)}
                            className="text-red-600 hover:bg-red-50"
                            title="Delete Submission"
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
        </CardContent>
      </Card>
    </div>
  );
}
