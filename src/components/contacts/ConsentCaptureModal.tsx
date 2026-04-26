'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Check, X, Pause } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { api } from '@/lib/api';
import type { Contact, SmsConsentStatus } from '@/lib/types';
import styles from './ConsentCaptureModal.module.css';

export interface ConsentCaptureModalProps {
  /** The student whose pickup the consent is for — used in the header
   *  copy ("SMS consent for Olivia's parent"). */
  studentFirstName: string;
  /** The parent we're asking about. Routed by the caller (typically the
   *  primary communication parent or the session pickup parent). */
  parent: Contact;
  /**
   * Wire-format source enum that gets recorded with the change.
   * Defaults to 'manual_entry' to match Phase 1's coarse enum buckets;
   * pass 'phone_call' when the staff explicitly called the parent.
   */
  source?: string;
  onClose: () => void;
  /** Fired after a successful PATCH — caller invalidates relevant SWR
   *  caches and decides whether to do anything else (refresh badge,
   *  re-render the SmsTriggerButton, etc.). */
  onSaved: (newStatus: SmsConsentStatus) => void | Promise<void>;
}

/**
 * Fast three-button consent capture (PDF section 5). Different from the
 * Phase 1 EditSmsConsentModal — that one is a full-form edit (status
 * radio + source select + notes) used from the contact record. This one
 * is an instant-action picker used at moments where staff is asking the
 * parent directly (manual SMS triggers, the consent flow on the bathroom
 * button when status is no_reply).
 *
 * Three options:
 *   - Got consent, opt them in       → PATCH status: 'sms_on'
 *   - They declined, opt them out    → PATCH status: 'opted_out'
 *   - Ask later, skip for now        → no PATCH; close modal
 */
export default function ConsentCaptureModal({
  studentFirstName,
  parent,
  source = 'manual_entry',
  onClose,
  onSaved,
}: ConsentCaptureModalProps) {
  const { data: session } = useSession();
  const staffId = Number((session?.user as { id?: string } | undefined)?.id) || null;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (status: SmsConsentStatus) => {
    setSaving(true);
    setError(null);
    try {
      await api.contacts.updateSmsConsent(parent.id, {
        status,
        source,
        notes: 'Captured via consent modal',
        recorded_by_staff_id: staffId,
      });
      await onSaved(status);
    } catch (err) {
      console.error('ConsentCaptureModal: PATCH failed', err);
      setError('Failed to save. Please try again.');
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={saving ? () => {} : onClose}
      title={`SMS consent for ${studentFirstName}'s parent`}
      subtitle="Record consent to enable pickup and bathroom texts."
      maxWidth="420px"
    >
      <div className={styles.body}>
        <div className={styles.parentBlock}>
          <span className={styles.parentLabel}>PRIMARY COMMUNICATION PARENT</span>
          <span className={styles.parentName}>{parent.first_name} {parent.last_name}</span>
          {parent.phone && <span className={styles.parentPhone}>{parent.phone}</span>}
        </div>

        <div className={styles.options}>
          <button
            type="button"
            className={`${styles.option} ${styles.option_yes}`}
            onClick={() => submit('sms_on')}
            disabled={saving}
          >
            <span className={`${styles.icon} ${styles.icon_yes}`}>
              <Check size={16} strokeWidth={3} aria-hidden="true" />
            </span>
            <span className={styles.optionText}>
              <span className={styles.optionTitle}>Got consent, opt them in</span>
              <span className={styles.optionHint}>
                Parent verbally agreed to receive texts. Badge will switch to SMS on.
              </span>
            </span>
          </button>

          <button
            type="button"
            className={`${styles.option} ${styles.option_no}`}
            onClick={() => submit('opted_out')}
            disabled={saving}
          >
            <span className={`${styles.icon} ${styles.icon_no}`}>
              <X size={16} strokeWidth={3} aria-hidden="true" />
            </span>
            <span className={styles.optionText}>
              <span className={styles.optionTitle}>They declined, opt them out</span>
              <span className={styles.optionHint}>
                Parent said no. Badge will switch to Opted out. Do not re-ask.
              </span>
            </span>
          </button>

          <button
            type="button"
            className={`${styles.option} ${styles.option_skip}`}
            onClick={onClose}
            disabled={saving}
          >
            <span className={`${styles.icon} ${styles.icon_skip}`}>
              <Pause size={16} strokeWidth={3} aria-hidden="true" />
            </span>
            <span className={styles.optionText}>
              <span className={styles.optionTitle}>Ask later, skip for now</span>
              <span className={styles.optionHint}>
                Have not gotten a clear answer yet. Badge stays No reply.
              </span>
            </span>
          </button>
        </div>

        {error && <p className={styles.error} role="alert">{error}</p>}

        <div className={styles.actions}>
          <button type="button" className={styles.btnGhost} onClick={onClose} disabled={saving}>
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
