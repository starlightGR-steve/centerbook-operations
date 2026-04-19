'use client';

import AdminGate from '@/components/auth/AdminGate';
import ErrorBoundary from '@/components/ErrorBoundary';
import PipelinePage from '@/views/onboarding/PipelinePage';

export default function Page() {
  return (
    <AdminGate>
      <ErrorBoundary moduleName="Pipeline">
        <PipelinePage />
      </ErrorBoundary>
    </AdminGate>
  );
}
