'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Check, MessageSquare } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { api } from '@/lib/api';
import type { BathroomPreference } from '@/lib/types';
import styles from './PermissionCaptureModal.module.css';

export interface BathroomCaptureModalProps {
  studentId: number;
  /** Pre-select a value when opening the modal as an edit (pencil icon).
   *  Pass null/undefined for the first-capture (+) flow. */
  initialValue?: BathroomPreference | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

/**
 * Bathroom permission capture (Check-In Popup design reference, Visual 3).
 * Two stacked option cards + Skip for now / Save footer. Save commits via
 * PATCH /students/{id}/permissions with bathroom_preference + the session
 * staff id; backend appends the change to cb_student_permission_history.
 */
export default function BathroomCaptureModal({
  studentId,
  initialValue = null,
  onClose,
  onSaved,
}: BathroomCaptureModalProps) {
  const { data: session } = useSession();
  const staffId = Number((session?.user as { id?: string } | undefined)?.id) || null;

  const [selected, setSelected] = useState<BathroomPreference | null>(initialValue ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!selected || saving) return;
    setSaving(true);
    setError(null);
    try {
      await api.students.updatePermissions(studentId, {
        bathroom_preference: selected,
        changed_by_staff_id: staffId,
      });
      await onSaved();
      onClose();
    } catch (err) {
      console.error('BathroomCaptureModal: PATCH failed', err);
      setError('Failed to save. Please try again.');
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={saving ? () => {} : onClose}
      title="Bathroom accompaniment"
      subtitle={'\u201CHow should staff handle bathroom trips today?\u201D'}
      maxWidth="420px"
    >
      <div className={styles.body}>
        <div className={styles.options}>
          <button
            type="button"
            className={`${styles.option} ${selected === 'parent_text' ? styles.optionSelectedOrange : ''}`}
            onClick={() => setSelected('parent_text')}
            disabled={saving}
            aria-pressed={selected === 'parent_text'}
          >
            <span className={`${styles.icon} ${styles.iconOrange}`}>
              <MessageSquare size={16} strokeWidth={2.5} aria-hidden="true" />
            </span>
            <span className={styles.optionTitle}>Text parent when needed</span>
          </button>

          <button
            type="button"
            className={`${styles.option} ${selected === 'independent' ? styles.optionSelectedGreen : ''}`}
            onClick={() => setSelected('independent')}
            disabled={saving}
            aria-pressed={selected === 'independent'}
          >
            <span className={`${styles.icon} ${styles.iconGreen}`}>
              <Check size={16} strokeWidth={3} aria-hidden="true" />
            </span>
            <span className={styles.optionTitle}>Goes on their own</span>
          </button>
        </div>

        {error && <p className={styles.error} role="alert">{error}</p>}

        <div className={styles.actions}>
          <button type="button" className={styles.btnGhost} onClick={onClose} disabled={saving}>
            Skip for now
          </button>
          <button
            type="button"
            className={styles.btnSave}
            onClick={handleSave}
            disabled={!selected || saving}
          >
            {saving ? 'Saving\u2026' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
