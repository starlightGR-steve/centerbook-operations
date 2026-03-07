'use client';

import { useSession, signOut } from 'next-auth/react';
import { LogOut, UserCircle } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import styles from './MePage.module.css';

export default function MePage() {
  const { data: session } = useSession();

  const user = session?.user;
  const role = (user as { role?: string } | undefined)?.role ?? 'staff';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <SectionHeader
          script="Your"
          title="Profile"
          subtitle="Account info and session management"
        />
      </div>

      <div className={styles.content}>
        <Card className={styles.profileCard}>
          <div className={styles.avatar}>
            <UserCircle size={48} strokeWidth={1.5} />
          </div>
          <div className={styles.info}>
            <h3 className={styles.name}>{user?.name ?? 'Loading...'}</h3>
            <p className={styles.email}>{user?.email ?? ''}</p>
            <div className={styles.roleBadge}>
              <Badge variant={role === 'superuser' ? 'math' : role === 'admin' ? 'reading' : 'staff'}>
                {role}
              </Badge>
            </div>
          </div>
        </Card>

        <Card className={styles.actionsCard}>
          <h4 className={styles.sectionTitle}>Session</h4>
          <p className={styles.sectionDesc}>
            Sign out of CenterBook Operations on this device.
          </p>
          <Button
            variant="secondary"
            size="md"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut size={16} />
            Sign Out
          </Button>
        </Card>
      </div>
    </div>
  );
}
