'use client';

import AdminGate from '@/components/auth/AdminGate';
import ErrorBoundary from '@/components/ErrorBoundary';
import ProgressPage from '@/views/progress/ProgressPage';

export default function Page() {
  return (
    <AdminGate>
      <ErrorBoundary moduleName="Progress">
        <ProgressPage />
      </ErrorBoundary>
    </AdminGate>
  );
}
