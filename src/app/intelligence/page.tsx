'use client';

import ErrorBoundary from '@/components/ErrorBoundary';
import IntelligencePage from '@/views/intelligence/IntelligencePage';

export default function Page() {
  return (
    <ErrorBoundary moduleName="Intelligence">
      <IntelligencePage />
    </ErrorBoundary>
  );
}
