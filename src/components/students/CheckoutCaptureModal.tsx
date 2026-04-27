'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Check, User } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { api } from '@/lib/api';
import type { CheckoutPreference, ExitEntrance } from '@/lib/types';
import styles from './PermissionCaptureModal.module.css';

export interface CheckoutCaptureModalProps {
  studentId: number;
  /** Pre-select values when opening the modal as an edit (pencil icon).
   *  Pass null/undefined for the first-capture (+) flow. */
  initialMode?: CheckoutPreference | null;
  initialEntrance?: ExitEntrance | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

/**
 * Checkout permission capture (Check-In Popup design reference, Visuals 4–5).
 * Two stacked option cards; once a mode is picked, an EXIT ENTRANCE row
 * appears with Front / Back pills. Save is gated on BOTH mode + entrance.
 * Commits via PATCH /students/{id}/permissions with checkout_preference +
 * exit_entrance + the session staff id.
 */
export default function CheckoutCaptureModal({
  studentId,
  initialMode = null,
  initialEntrance = null,
  onClose,
  onSaved,
}: CheckoutCaptureModalProps) {
  const { data: session } = useSession();
  const staffId = Number((session?.user as { id?: string } | undefined)?.id) || null;

  const [mode, setMode] = useState<CheckoutPreference | null>(initialMode ?? null);
  const [entrance, setEntrance] = useState<ExitEntrance | null>(initialEntrance ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = !!mode && !!entrance && !saving;

  const handleSave = async () => {
    if (!canSave || !mode || !entrance) return;
    setSaving(true);
    setError(null);
    try {
      await api.students.updatePermissions(studentId, {
        checkout_preference: mode,
        exit_entrance: entrance,
        changed_by_staff_id: staffId,
      });
      await onSaved();
      onClose();
    } catch (err) {
      console.error('CheckoutCaptureModal: PATCH failed', err);
      setError('Failed to save. Please try again.');
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={saving ? () => {} : onClose}
      title="Checkout preference"
      subtitle={'\u201CHow will they leave today?\u201D'}
      maxWidth="420px"
    >
      <div className={styles.body}>
        <div className={styles.options}>
          <button
            type="button"
            className={`${styles.option} ${mode === 'waits_for_parent' ? styles.optionSelectedOrange : ''}`}
            onClick={() => setMode('waits_for_parent')}
            disabled={saving}
            aria-pressed={mode === 'waits_for_parent'}
          >
            <span className={`${styles.icon} ${styles.iconOrange}`}>
              <User size={16} strokeWidth={2.5} aria-hidden="true" />
            </span>
            <span className={styles.optionTitle}>Waits for parent</span>
          </button>

          <button
            type="button"
            className={`${styles.option} ${mode === 'independent' ? styles.optionSelectedTeal : ''}`}
            onClick={() => setMode('independent')}
            disabled={saving}
            aria-pressed={mode === 'independent'}
          >
            <span className={`${styles.icon} ${styles.iconTeal}`}>
              <Check size={16} strokeWidth={3} aria-hidden="true" />
            </span>
            <span className={styles.optionTitle}>Checks out independently</span>
          </button>
        </div>

        {mode && (
          <div className={styles.entranceBlock}>
            <span className={styles.entranceLabel}>EXIT ENTRANCE</span>
            <div className={styles.entrancePills}>
              <button
                type="button"
                className={`${styles.entrancePill} ${entrance === 'front' ? styles.entrancePillSelected : ''}`}
                onClick={() => setEntrance('front')}
                disabled={saving}
                aria-pressed={entrance === 'front'}
              >
                Front
              </button>
              <button
                type="button"
                className={`${styles.entrancePill} ${entrance === 'back' ? styles.entrancePillSelected : ''}`}
                onClick={() => setEntrance('back')}
                disabled={saving}
                aria-pressed={entrance === 'back'}
              >
                Back
              </button>
            </div>
          </div>
        )}

        {error && <p className={styles.error} role="alert">{error}</p>}

        <div className={styles.actions}>
          <button type="button" className={styles.btnGhost} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.btnSave}
            onClick={handleSave}
            disabled={!canSave}
          >
            {saving ? 'Saving\u2026' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
