'use client';

import ErrorBoundary from '@/components/ErrorBoundary';
import LogisticsPage from '@/views/logistics/LogisticsPage';

export default function Page() {
  return (
    <ErrorBoundary moduleName="Logistics">
      <LogisticsPage />
    </ErrorBoundary>
  );
}
