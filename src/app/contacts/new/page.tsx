'use client';

import ErrorBoundary from '@/components/ErrorBoundary';
import CreateContactPage from '@/views/contacts/CreateContactPage';

export default function Page() {
  return (
    <ErrorBoundary moduleName="New Contact">
      <CreateContactPage />
    </ErrorBoundary>
  );
}
