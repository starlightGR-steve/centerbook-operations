'use client';

import { useSearchParams, usePathname } from 'next/navigation';
import { Suspense } from 'react';
import Sidebar from './Sidebar';
import styles from './Shell.module.css';

function ShellInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const isEmbedded = searchParams.get('embedded') === 'true';
  const isLogin = pathname === '/login';
  const hideSidebar = isEmbedded || isLogin;

  return (
    <div className={`${styles.shell} ${hideSidebar ? styles.shellEmbedded : ''}`}>
      {!hideSidebar && <Sidebar />}
      <main id="main-content" className={`${styles.main} ${hideSidebar ? styles.mainEmbedded : ''}`}>
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
