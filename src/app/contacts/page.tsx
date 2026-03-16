'use client';

import ErrorBoundary from '@/components/ErrorBoundary';
import SectionHeader from '@/components/ui/SectionHeader';

export default function Page() {
  return (
    <ErrorBoundary moduleName="Contacts">
      <div style={{ padding: '40px', height: '100%', background: 'var(--base)' }}>
        <SectionHeader
          script="Manage Your"
          title="Contacts"
          subtitle="Parent and guardian contact list. Coming soon."
        />
      </div>
    </ErrorBoundary>
  );
}
