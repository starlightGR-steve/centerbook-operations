'use client';

import ErrorBoundary from '@/components/ErrorBoundary';
import ProgressPage from '@/views/progress/ProgressPage';

export default function Page() {
  return (
    <ErrorBoundary moduleName="Progress">
      <ProgressPage />
    </ErrorBoundary>
  );
}
