'use client';

import { useSearchParams, usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from './Sidebar';
import MobileNav from './BottomNav';
import NotificationBanner from '@/components/NotificationBanner';
import styles from './Shell.module.css';

function ShellInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { data: session } = useSession();
  const isEmbedded = searchParams.get('embedded') === 'true';
  const isLogin = pathname === '/login';
  const isLobbyBoard = pathname === '/lobby-board';
  const hideSidebar = isEmbedded || isLogin || isLobbyBoard;
  const staffId = session?.user ? Number((session.user as { id: string }).id) : null;

  return (
    <div className={`${styles.shell} ${hideSidebar ? styles.shellEmbedded : ''}`}>
      {!hideSidebar && <Sidebar />}
      <div className={styles.mainColumn}>
        {!hideSidebar && <MobileNav />}
        {!hideSidebar && staffId && <NotificationBanner staffId={staffId} />}
        <main id="main-content" className={`${styles.main} ${hideSidebar ? styles.mainEmbedded : ''}`}>
          {children}
        </main>
      </div>
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
