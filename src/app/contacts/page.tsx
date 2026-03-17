'use client';

import ErrorBoundary from '@/components/ErrorBoundary';
import ContactsPage from '@/views/contacts/ContactsPage';

export default function Page() {
  return (
    <ErrorBoundary moduleName="Contacts">
      <ContactsPage />
    </ErrorBoundary>
  );
}
