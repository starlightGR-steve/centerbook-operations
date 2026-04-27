'use client';

import { useEffect, useState, useCallback } from 'react';
import { Send } from 'lucide-react';
import { api } from '@/lib/api';
import type { Contact, BathroomPreference, CheckoutPreference, ExitEntrance } from '@/lib/types';
import SmsTriggerButton from '@/components/contacts/SmsTriggerButton';
import AmberInlineNote from '@/components/ui/AmberInlineNote';
import styles from './PermissionsPickupCard.module.css';

/**
 * 86agzuwdf §3B Permissions & Pickup card.
 *
 * Bathroom subsection — Phase 2 of the SMS consent design takes over the
 * routing here. The PDF section 4 specifies a three-state pattern that
 * mirrors any manual SMS trigger:
 *
 *   sms_on    → "Send bathroom text" → POST /cb/v1/sms/bathroom-request
 *   opted_out → amber "Call <Parent>" reference display (no tap)
 *   no_reply  → "Get consent" button → opens ConsentCaptureModal
 *
 * SmsTriggerButton encapsulates that switch. This card supplies the
 * routed parent (primary communication contact for now), the send
 * handler (api.sms.bathroomRequest), and the post-send lockout that
 * keeps staff from spam-sending. Future work will let staff route to
 * the session pickup parent instead when one is set on the attendance
 * record; primary is the default per the design doc.
 *
 * The 4-state machine planned in the original card (independent / send
 * SMS / send-to-management opted-out / send-to-management no-permission)
 * collapses now that the SMS path exists. The previous "Send to
 * management" behavior was a stopgap; if a separate management-escalation
 * affordance is needed it'll live elsewhere.
 */

const LOCKOUT_MS = 5 * 60 * 1000;

interface PermissionsPickupCardProps {
  studentId: number;
  studentFirstName: string;
  attendanceId: number;
  staffId: number;
  /** Primary communication parent for the student. Source of truth for
   *  the SmsTriggerButton's three-state render and the bathroom-request
   *  routing. Pass null when no primary contact is on file — the button
   *  renders disabled in that case. */
  primaryParent: Contact | null;
  /** Per-student permission fields surfaced by mu-plugin v2.60.0 on both
   *  bulk and single endpoints. Drive the bathroom subsection's render
   *  (independent → no button; parent_text → SmsTriggerButton; null →
   *  amber "Not on file") and the pickup subsection's value display. */
  bathroomPreference?: BathroomPreference | null;
  checkoutPreference?: CheckoutPreference | null;
  exitEntrance?: ExitEntrance | null;
}

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
  studentFirstName,
  attendanceId,
  staffId,
  primaryParent,
  bathroomPreference,
  checkoutPreference,
  exitEntrance,
}: PermissionsPickupCardProps) {
  // Post-send lockout — preserves the existing 5-minute "Request sent" UX
  // so staff can't fire repeated bathroom texts to the same parent.
  const [lockoutAt, setLockoutAt] = useState<number | null>(() =>
    readLockoutExpiry(studentId, attendanceId)
  );
  const [pending, setPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const handleSend = useCallback(async () => {
    if (pending || lockoutAt !== null) return;
    setPending(true);
    setErrorMsg(null);
    try {
      await api.sms.bathroomRequest({
        student_id: studentId,
        attendance_id: attendanceId,
        staff_id: staffId,
      });
      const expires = Date.now() + LOCKOUT_MS;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(lockoutKey(studentId, attendanceId), String(expires));
      }
      setLockoutAt(expires);
    } catch (err) {
      console.error('PermissionsPickupCard: bathroom-request failed', err);
      setErrorMsg('Could not send. Please try again.');
    } finally {
      setPending(false);
    }
  }, [pending, lockoutAt, studentId, attendanceId, staffId]);

  // The "send time" shown in the locked label is lockout - 5min, which is
  // when the request actually went out. Recover that for display.
  const sentAt = lockoutAt !== null ? lockoutAt - LOCKOUT_MS : null;

  // Bathroom subsection branches on cb_students.bathroom_preference (mu-plugin
  // v2.60.0). 'independent' → no send button, just the static "Goes on their
  // own" note (matches the Attendance Text dropdown's disabled-with-subtitle
  // treatment per Visual 8). 'parent_text' → render SmsTriggerButton, which
  // cascades through the SMS-consent three-state. null ('not on file') →
  // amber inline note prompting staff to capture the value on the Student
  // Record or via the check-in popup; firing a text without a known policy
  // would surprise the parent.
  const bathroomBody = bathroomPreference === 'independent' ? (
    <p className={styles.staticNote}>Goes on their own</p>
  ) : bathroomPreference === 'parent_text' ? (
    lockoutAt !== null ? (
      <button
        type="button"
        className={`${styles.actionBtn} ${styles.actionBtnSent}`}
        disabled
        aria-live="polite"
      >
        Request sent &middot; {sentAt !== null ? formatHHMM(sentAt) : ''}
      </button>
    ) : (
      <SmsTriggerButton
        parent={primaryParent}
        studentFirstName={studentFirstName}
        sendLabel="Send bathroom text"
        sendIcon={<Send size={14} aria-hidden="true" />}
        onSend={handleSend}
        sending={pending}
        captureSource="manual_entry"
      />
    )
  ) : (
    <AmberInlineNote>Bathroom preference not on file</AmberInlineNote>
  );

  // Pickup subsection (mu-plugin v2.60.0). Combined display: "Parent Pickup"
  // for waits_for_parent, "Independent · Front" / "Independent · Back" for
  // independent + exit_entrance. Missing pieces collapse to amber.
  const pickupBody = (() => {
    if (checkoutPreference === 'waits_for_parent') {
      return <p className={styles.staticNote}>Parent Pickup</p>;
    }
    if (checkoutPreference === 'independent' && exitEntrance) {
      return (
        <p className={styles.staticNote}>
          Independent &middot; {exitEntrance === 'front' ? 'Front' : 'Back'}
        </p>
      );
    }
    return <AmberInlineNote>Checkout preference not on file</AmberInlineNote>;
  })();

  return (
    <div className={styles.card}>
      <h4 className={styles.title}>Permissions &amp; Pickup</h4>

      {/* ── Bathroom subsection ────────────────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionLabel}>Bathroom</span>
        </div>
        {bathroomBody}
        {errorMsg && (
          <p className={styles.errorMsg} role="alert">{errorMsg}</p>
        )}
      </div>

      {/* ── Pickup subsection ──────────────────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionLabel}>Pickup</span>
        </div>
        {pickupBody}
      </div>
    </div>
  );
}
