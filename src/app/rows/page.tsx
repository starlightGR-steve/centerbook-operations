'use client';

import ErrorBoundary from '@/components/ErrorBoundary';
import RowsPage from '@/views/rows/RowsPage';

export default function Page() {
  return (
    <ErrorBoundary moduleName="Rows">
      <RowsPage />
    </ErrorBoundary>
  );
}
