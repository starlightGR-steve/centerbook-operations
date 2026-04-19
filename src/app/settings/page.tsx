'use client';

import AdminGate from '@/components/auth/AdminGate';
import ErrorBoundary from '@/components/ErrorBoundary';
import CenterSetupPage from '@/views/settings/CenterSetupPage';

export default function Page() {
  return (
    <AdminGate>
      <ErrorBoundary moduleName="Center Setup">
        <CenterSetupPage />
      </ErrorBoundary>
    </AdminGate>
  );
}
