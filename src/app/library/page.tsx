'use client';

import ErrorBoundary from '@/components/ErrorBoundary';
import LibraryPage from '@/views/library/LibraryPage';

export default function Page() {
  return (
    <ErrorBoundary moduleName="Library">
      <LibraryPage />
    </ErrorBoundary>
  );
}
