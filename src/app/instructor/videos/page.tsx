import React from 'react';
import InstructorLayoutWrapper from '@/components/instructor/InstructorLayoutWrapper';
import VideoAdminDashboard from '@/components/admin/VideoAdminDashboard';

export default function InstructorVideosPage() {
  return (
    <InstructorLayoutWrapper>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Videos Management</h1>
          <p className="text-gray-600">Manage video content and metadata for lessons</p>
        </div>
        <VideoAdminDashboard />
      </div>
    </InstructorLayoutWrapper>
  );
}