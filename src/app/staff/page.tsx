'use client';

import AdminGate from '@/components/auth/AdminGate';
import ErrorBoundary from '@/components/ErrorBoundary';
import StaffPage from '@/views/staff/StaffPage';

export default function Page() {
  return (
    <AdminGate>
      <ErrorBoundary moduleName="Staff">
        <StaffPage />
      </ErrorBoundary>
    </AdminGate>
  );
}
