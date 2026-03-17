'use client';

import ErrorBoundary from '@/components/ErrorBoundary';
import CreateStudentPage from '@/views/students/CreateStudentPage';

export default function Page() {
  return (
    <ErrorBoundary moduleName="New Student">
      <CreateStudentPage />
    </ErrorBoundary>
  );
}
