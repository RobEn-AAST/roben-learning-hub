import React from 'react';
import InstructorLayoutWrapper from '@/components/instructor/InstructorLayoutWrapper';
import { InstructorDashboard } from '@/components/instructor/InstructorDashboard';

export default function InstructorPage() {
  return (
    <InstructorLayoutWrapper>
      <InstructorDashboard />
    </InstructorLayoutWrapper>
  );
}