'use client';

import ErrorBoundary from '@/components/ErrorBoundary';
import KioskPage from '@/views/kiosk/KioskPage';

export default function Page() {
  return (
    <ErrorBoundary moduleName="Kiosk">
      <KioskPage />
    </ErrorBoundary>
  );
}
