'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import styles from './PermissionsPickupCard.module.css';

/**
 * 86agzuwdf §3B Permissions & Pickup card.
 *
 * Bathroom subsection — 4-state machine planned in master spec:
 *   1. Independent (no SMS button needed)
 *   2. Text parent — SMS on file, consent active → POST /sms/bathroom-request
 *   3. Text parent — SMS opted out → "Send to management" (reason: opted_out_sms)
 *   4. Permission not on file → "Send to management" (reason: no_permission_on_file)
 *
 * Phase 3 builds states 3 + 4 only. State 1/2 detection requires the
 * `bathroom_permission_on_file` field on Student, which doesn't exist yet
 * (deferred; flagged for separate ticket). Until then we hard-code state 4.
 *
 * Pickup section (Pickup today line) is also deferred — `checkout_preference`
 * field doesn't exist either.
 */

const LOCKOUT_MS = 5 * 60 * 1000;

interface PermissionsPickupCardProps {
  studentId: number;
  attendanceId: number;
  staffId: number;
}

type BathroomState = 1 | 2 | 3 | 4;

function lockoutKey(studentId: number, attendanceId: number): string {
  return `bathroom-lockout-${studentId}-${attendanceId}`;
}

function readLockoutExpiry(studentId: number, attendanceId: number): number | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(lockoutKey(studentId, attendanceId));
  if (!raw) return null;
  const expiresAt = Number(raw);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    window.localStorage.removeItem(lockoutKey(studentId, attendanceId));
    return null;
  }
  return expiresAt;
}

function formatHHMM(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function PermissionsPickupCard({
  studentId,
  attendanceId,
  staffId,
}: PermissionsPickupCardProps) {
  // TODO(86agzuwdf §3B): replace this with state-detection logic once the
  // `bathroom_permission_on_file` field on Student exists. Future shape:
  //   if (!hasBathroomPermission) return 4;
  //   if (!hasPhone)              return 1;
  //   if (smsOptedOut)            return 3;
  //   return 2;
  // For now, every render falls to state 4.
  // (Type kept as the BathroomState union for future-proofing, even though
  //  TS narrows the literal today.)
  void ({} as BathroomState); // keeps the union referenced for editor goto-def

  // The button shows a 5-minute "Request sent · HH:MM" lockout after a successful
  // POST. Lockout state is persisted to localStorage so closing/reopening the
  // panel mid-lockout doesn't reset it. The expiry timestamp itself is the source
  // of truth — we just rehydrate from it on mount.
  const [lockoutAt, setLockoutAt] = useState<number | null>(() =>
    readLockoutExpiry(studentId, attendanceId)
  );
  const [pending, setPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset state when the (student, attendance) tuple changes — e.g., reopen
  // panel for a different student.
  useEffect(() => {
    setLockoutAt(readLockoutExpiry(studentId, attendanceId));
    setErrorMsg(null);
    setPending(false);
  }, [studentId, attendanceId]);

  // Auto-clear lockout when timer expires while the panel is open.
  useEffect(() => {
    if (lockoutAt === null) return;
    const remainingMs = lockoutAt - Date.now();
    if (remainingMs <= 0) {
      setLockoutAt(null);
      return;
    }
    const t = window.setTimeout(() => setLockoutAt(null), remainingMs);
    return () => window.clearTimeout(t);
  }, [lockoutAt]);

  const sendToManagement = useCallback(async () => {
    if (pending || lockoutAt !== null) return;
    setPending(true);
    setErrorMsg(null);
    try {
      await api.notifications.create({
        type: 'bathroom_management_request',
        student_id: studentId,
        attendance_id: attendanceId,
        // State 4 is the only reachable path today. State 3 ('opted_out_sms')
        // and state 1/2 will switch this string when detection lands.
        reason: 'no_permission_on_file',
        requested_by: staffId,
      });
      // Q3 decision: client-side timestamp is fine for minute-level display.
      // Backend doesn't return created_at on the typed response shape today.
      const expires = Date.now() + LOCKOUT_MS;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(lockoutKey(studentId, attendanceId), String(expires));
      }
      setLockoutAt(expires);
    } catch (err) {
      console.error('PermissionsPickupCard: bathroom_management_request failed', err);
      setErrorMsg('Could not send. Please try again.');
    } finally {
      setPending(false);
    }
  }, [pending, lockoutAt, studentId, attendanceId, staffId]);

  // The "send time" shown in the locked label is lockout - 5min, which is when
  // the request actually went out. Recover that for display.
  const sentAt = lockoutAt !== null ? lockoutAt - LOCKOUT_MS : null;

  return (
    <div className={styles.card}>
      <h4 className={styles.title}>Permissions &amp; Pickup</h4>

      {/* ── Bathroom subsection ────────────────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionLabel}>Bathroom</span>
        </div>

        {/* States 1/2 are not yet detectable — see TODO above. */}
        <div className={styles.stateRow}>
          <div className={styles.stateInfo}>
            <AlertTriangle size={14} className={styles.stateIcon} aria-hidden="true" />
            <span className={styles.stateText}>Permission not on file</span>
          </div>

          {lockoutAt === null ? (
            <button
              type="button"
              className={styles.actionBtn}
              onClick={sendToManagement}
              disabled={pending}
              aria-label="Send bathroom request to management"
            >
              {pending ? 'Sending...' : 'Send to management'}
            </button>
          ) : (
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.actionBtnSent}`}
              disabled
              aria-live="polite"
            >
              Request sent &middot; {sentAt !== null ? formatHHMM(sentAt) : ''}
            </button>
          )}
        </div>

        {errorMsg && (
          <p className={styles.errorMsg} role="alert">{errorMsg}</p>
        )}
      </div>

      {/* Pickup subsection deferred until `checkout_preference` field exists. */}
    </div>
  );
}
