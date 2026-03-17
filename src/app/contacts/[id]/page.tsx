'use client';

import { use } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import ContactProfilePage from '@/views/contacts/ContactProfilePage';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <ErrorBoundary moduleName="Contact Profile">
      <ContactProfilePage contactId={Number(id)} />
    </ErrorBoundary>
  );
}
