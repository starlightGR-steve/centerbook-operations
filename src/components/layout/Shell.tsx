'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Sidebar from './Sidebar';
import styles from './Shell.module.css';

function ShellInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const isEmbedded = searchParams.get('embedded') === 'true';

  return (
    <div className={`${styles.shell} ${isEmbedded ? styles.shellEmbedded : ''}`}>
      {!isEmbedded && <Sidebar />}
      <main id="main-content" className={`${styles.main} ${isEmbedded ? styles.mainEmbedded : ''}`}>
        {children}
      </main>
    </div>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <ShellInner>{children}</ShellInner>
    </Suspense>
  );
}
