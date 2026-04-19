'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { ReactNode } from 'react';

interface AdminGateProps {
  children: ReactNode;
}

/**
 * Client-side gate for admin-only routes. Fails closed: any role that is not
 * literally 'admin' or 'superuser' is redirected to /kiosk. Complements the
 * backend auth split (v2.46.0) and the API route role checks — prevents staff
 * accounts from rendering admin UI skeletons or leaking proxy-fed read data.
 */
export default function AdminGate({ children }: AdminGateProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const role = session?.user?.role;
  const isAuthorized = role === 'admin' || role === 'superuser';

  useEffect(() => {
    if (status === 'authenticated' && !isAuthorized) {
      router.replace('/kiosk');
    }
  }, [status, isAuthorized, router]);

  if (status === 'loading') {
    return (
      <div
        style={{
          padding: 'var(--space-8)',
          textAlign: 'center',
          color: 'var(--neutral)',
          fontSize: 'var(--text-md)',
          fontFamily: 'Montserrat, sans-serif',
        }}
      >
        Loading…
      </div>
    );
  }

  if (status === 'unauthenticated' || !isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
