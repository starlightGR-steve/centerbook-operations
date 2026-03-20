'use client';

import ErrorBoundary from '@/components/ErrorBoundary';
import StaffSchedulePage from '@/views/staff-schedule/StaffSchedulePage';

export default function Page() {
  return (
    <ErrorBoundary moduleName="Staff Schedule">
      <StaffSchedulePage />
    </ErrorBoundary>
  );
}
