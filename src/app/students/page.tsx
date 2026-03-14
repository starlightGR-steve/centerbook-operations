'use client';

import ErrorBoundary from '@/components/ErrorBoundary';
import StudentsRosterPage from '@/views/students/StudentsRosterPage';

export default function Page() {
  return (
    <ErrorBoundary moduleName="Students">
      <StudentsRosterPage />
    </ErrorBoundary>
  );
}
