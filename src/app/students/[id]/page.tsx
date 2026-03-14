'use client';

import { use } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import StudentProfilePage from '@/views/students/StudentProfilePage';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <ErrorBoundary moduleName="Student Profile">
      <StudentProfilePage studentId={Number(id)} />
    </ErrorBoundary>
  );
}
