'use client';

import ErrorBoundary from '@/components/ErrorBoundary';
import StaffPage from '@/views/staff/StaffPage';

export default function Page() {
  return (
    <ErrorBoundary moduleName="Staff">
      <StaffPage />
    </ErrorBoundary>
  );
}
