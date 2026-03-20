'use client';

import ErrorBoundary from '@/components/ErrorBoundary';
import PipelinePage from '@/views/onboarding/PipelinePage';

export default function Page() {
  return (
    <ErrorBoundary moduleName="Pipeline">
      <PipelinePage />
    </ErrorBoundary>
  );
}
