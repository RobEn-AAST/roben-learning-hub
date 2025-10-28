// Example React component for managing course instructors
// You can add this to your course management interface

'use client';

import React, { useState, useEffect } from 'react';
import { courseInstructorService, CourseInstructor } from '../../services/courseInstructorService';

interface CourseInstructorManagerProps {
  courseId: string;
  currentUserId: string; // Must be admin to use this component
}

export function CourseInstructorManager({ courseId, currentUserId }: CourseInstructorManagerProps) {
  const [instructors, setInstructors] = useState<CourseInstructor[]>([]);
  const [availableInstructors, setAvailableInstructors] = useState<{ id: string; first_name?: string; last_name?: string; email: string }[]>([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState('');
  const [selectedRole] = useState<'instructor'>('instructor'); // Only instructor role allowed
  const [loading, setLoading] = useState(false);

  // Load data
  useEffect(() => {
    const loadInstructors = async () => {
      try {
        const data = await courseInstructorService.getCourseInstructors(courseId);
        setInstructors(data);
      } catch (error) {
        console.error('Failed to load instructors:', error);
      }
    };

    const loadAvailableInstructors = async () => {
      try {
        const data = await courseInstructorService.getAvailableInstructors();
        setAvailableInstructors(data);
      } catch (error) {
        console.error('Failed to load available instructors:', error);
      }
    };

    loadInstructors();
    loadAvailableInstructors();
  }, [courseId]);

  const loadInstructors = async () => {
    try {
      const data = await courseInstructorService.getCourseInstructors(courseId);
      setInstructors(data);
    } catch (error) {
      console.error('Failed to load instructors:', error);
    }
  };

  const handleAssignInstructor = async () => {
    if (!selectedInstructorId) return;

    setLoading(true);
    try {
      await courseInstructorService.assignInstructor({
        course_id: courseId,
        instructor_id: selectedInstructorId,
        role: selectedRole,
        assigned_by: currentUserId // Must be admin
      });
      
      setSelectedInstructorId('');
      // selectedRole is always 'instructor', no need to reset
      await loadInstructors();
      alert('Instructor assigned successfully!');
    } catch (error) {
      alert(`Failed to assign instructor: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveInstructor = async (instructorId: string, instructorName: string) => {
    if (!confirm(`Remove ${instructorName} as instructor from this course?`)) return;

    setLoading(true);
    try {
      await courseInstructorService.removeInstructor(courseId, instructorId, currentUserId); // Must be admin
      await loadInstructors();
      alert('Instructor removed successfully!');
    } catch (error) {
      alert(`Failed to remove instructor: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Role update removed - only 'instructor' role exists
  
  const getRoleBadge = () => {
    // Only instructor role exists now
    return 'bg-green-100 text-green-800';
  };

  const getAvailableInstructorsForSelection = () => {
    const assignedIds = instructors.map(i => i.instructor_id);
    return availableInstructors.filter(i => !assignedIds.includes(i.id));
  };

  return (
    <div className="bg-white p-6 rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">Course Instructors</h3>
      
      {/* Current Instructors */}
      <div className="mb-6">
        <h4 className="font-medium mb-3">Current Instructors ({instructors.length})</h4>
        {instructors.length === 0 ? (
          <p className="text-gray-500">No instructors assigned to this course yet.</p>
        ) : (
          <div className="space-y-3">
            {instructors.map((instructor) => (
              <div key={instructor.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center space-x-3">
                  <div>
                    <p className="font-medium">{(instructor.instructor?.first_name || instructor.instructor?.last_name) ? [instructor.instructor?.first_name, instructor.instructor?.last_name].filter(Boolean).join(' ') : instructor.instructor?.email}</p>
                    <p className="text-sm text-gray-600">{instructor.instructor?.email}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadge()}`}>
                    INSTRUCTOR
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Role selection removed - only instructor role exists */}
                  <button
                    onClick={() => handleRemoveInstructor(instructor.instructor_id, (instructor.instructor?.first_name || instructor.instructor?.last_name) ? [instructor.instructor?.first_name, instructor.instructor?.last_name].filter(Boolean).join(' ') : (instructor.instructor?.email || 'Unknown'))}
                    disabled={loading}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add New Instructor */}
      <div className="border-t pt-4">
        <h4 className="font-medium mb-3">Assign New Instructor</h4>
        <div className="flex gap-3">
          <select
            value={selectedInstructorId}
            onChange={(e) => setSelectedInstructorId(e.target.value)}
            disabled={loading}
            className="flex-1 border rounded px-3 py-2"
          >
            <option value="">Select an instructor...</option>
            {getAvailableInstructorsForSelection().map((instructor) => (
              <option key={instructor.id} value={instructor.id}>
                {(instructor.first_name || instructor.last_name) ? [instructor.first_name, instructor.last_name].filter(Boolean).join(' ') : instructor.email} ({instructor.email})
              </option>
            ))}
          </select>
          {/* Role is always 'instructor' - no selection needed */}
          <div className="border rounded px-3 py-2 bg-gray-50">
            Role: Instructor (only role available)
          </div>
          <button
            onClick={handleAssignInstructor}
            disabled={loading || !selectedInstructorId}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Assigning...' : 'Assign'}
          </button>
        </div>
        {getAvailableInstructorsForSelection().length === 0 && (
          <p className="text-sm text-gray-500 mt-2">All available instructors have been assigned to this course.</p>
        )}
      </div>
    </div>
  );
}