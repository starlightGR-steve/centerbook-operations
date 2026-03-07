'use client';

import ErrorBoundary from '@/components/ErrorBoundary';
import AttendancePage from '@/views/attendance/AttendancePage';

export default function Page() {
  return (
    <ErrorBoundary moduleName="Attendance">
      <AttendancePage />
    </ErrorBoundary>
  );
}
