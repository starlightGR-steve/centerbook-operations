'use client';

import ErrorBoundary from '@/components/ErrorBoundary';
import MePage from '@/views/me/MePage';

export default function Page() {
  return (
    <ErrorBoundary moduleName="Me">
      <MePage />
    </ErrorBoundary>
  );
}
