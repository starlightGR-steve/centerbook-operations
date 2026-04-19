'use client';

import AdminGate from '@/components/auth/AdminGate';
import ErrorBoundary from '@/components/ErrorBoundary';
import IntelligencePage from '@/views/intelligence/IntelligencePage';

export default function Page() {
  return (
    <AdminGate>
      <ErrorBoundary moduleName="Intelligence">
        <IntelligencePage />
      </ErrorBoundary>
    </AdminGate>
  );
}
