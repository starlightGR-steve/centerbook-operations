'use client';

import ErrorBoundary from '@/components/ErrorBoundary';
import CenterSetupPage from '@/views/settings/CenterSetupPage';

export default function Page() {
  return (
    <ErrorBoundary moduleName="Center Setup">
      <CenterSetupPage />
    </ErrorBoundary>
  );
}
