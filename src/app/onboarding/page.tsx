'use client';

import ErrorBoundary from '@/components/ErrorBoundary';
import SectionHeader from '@/components/ui/SectionHeader';

export default function Page() {
  return (
    <ErrorBoundary moduleName="Onboarding">
      <div style={{ padding: '40px', height: '100%', background: 'var(--base)' }}>
        <SectionHeader
          script="Family"
          title="Onboarding"
          subtitle="Family enrollment pipeline. Coming soon."
        />
      </div>
    </ErrorBoundary>
  );
}
