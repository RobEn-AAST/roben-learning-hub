import React from 'react';
import InstructorLayoutWrapper from '@/components/instructor/InstructorLayoutWrapper';
import { InstructorTablesManager } from '@/components/instructor/InstructorTablesManager';

export default function InstructorTablesPage() {
  return (
    <InstructorLayoutWrapper>
      <InstructorTablesManager />
    </InstructorLayoutWrapper>
  );
}