'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { LogOut, UserCircle, Key, Eye, EyeOff } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import styles from './MePage.module.css';

export default function MePage() {
  const { data: session } = useSession();

  const user = session?.user;
  const role = (user as { role?: string } | undefined)?.role ?? 'staff';

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChangePassword = async () => {
    setPwMessage(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwMessage({ type: 'error', text: 'All fields are required.' });
      return;
    }
    if (newPassword.length < 8) {
      setPwMessage({ type: 'error', text: 'New password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setPwLoading(true);
    try {
      const res = await fetch('/api/staff/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setPwMessage({ type: 'success', text: 'Password updated successfully.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPwMessage({
          type: 'error',
          text: data.message || data.error || 'Failed to update password.',
        });
      }
    } catch {
      setPwMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setPwLoading(false);
    }
  };

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
          <h4 className={styles.sectionTitle}>
            <Key size={15} /> Change Password
          </h4>
          <p className={styles.sectionDesc}>
            Update your Center Book Operations password.
          </p>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Current Password</label>
            <div className={styles.passwordWrap}>
              <input
                type={showCurrent ? 'text' : 'password'}
                className={styles.fieldInput}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.toggleVis}
                onClick={() => setShowCurrent(!showCurrent)}
                aria-label={showCurrent ? 'Hide password' : 'Show password'}
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>New Password</label>
            <div className={styles.passwordWrap}>
              <input
                type={showNew ? 'text' : 'password'}
                className={styles.fieldInput}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className={styles.toggleVis}
                onClick={() => setShowNew(!showNew)}
                aria-label={showNew ? 'Hide password' : 'Show password'}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Confirm New Password</label>
            <div className={styles.passwordWrap}>
              <input
                type={showNew ? 'text' : 'password'}
                className={styles.fieldInput}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>

          {pwMessage && (
            <p className={pwMessage.type === 'success' ? styles.msgSuccess : styles.msgError}>
              {pwMessage.text}
            </p>
          )}

          <Button
            variant="primary"
            size="md"
            onClick={handleChangePassword}
            disabled={pwLoading}
          >
            {pwLoading ? 'Updating...' : 'Update Password'}
          </Button>
        </Card>

        <Card className={styles.actionsCard}>
          <h4 className={styles.sectionTitle}>Session</h4>
          <p className={styles.sectionDesc}>
            Sign out of The Center Book Operations on this device.
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
