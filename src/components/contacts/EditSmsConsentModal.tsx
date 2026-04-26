'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Check, X, Circle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { api } from '@/lib/api';
import type { Contact, SmsConsentStatus } from '@/lib/types';
import {
  SMS_CONSENT_SOURCE_LABEL,
  SMS_CONSENT_SOURCE_WIRE,
  type SmsConsentSourceUi,
} from '@/lib/smsConsentSources';
import styles from './EditSmsConsentModal.module.css';

export interface EditSmsConsentModalProps {
  contact: Contact;
  onClose: () => void;
  /** Fired after a successful PATCH. Parent revalidates SWR caches and
   *  decides whether to close the modal or keep it open. */
  onSaved: () => void | Promise<void>;
}

const STATUS_OPTIONS: Array<{
  value: SmsConsentStatus;
  title: string;
  hint: string;
}> = [
  { value: 'sms_on', title: 'SMS on', hint: 'Parent consented to receive texts' },
  { value: 'opted_out', title: 'Opted out', hint: 'Parent declined or requested to stop' },
  { value: 'no_reply', title: 'No reply', hint: 'Clear status, needs to be asked again' },
];

/**
 * Manual edit dialog for the contact's SMS consent (PDF section 7, second
 * screenshot). Three radio cards + capture-source select + optional notes.
 * Save calls PATCH /contacts/{id}/sms-consent and notifies the caller so the
 * SmsPreferencesCard can refresh.
 */
export default function EditSmsConsentModal({ contact, onClose, onSaved }: EditSmsConsentModalProps) {
  const { data: session } = useSession();
  const staffId = Number((session?.user as { id?: string } | undefined)?.id) || null;

  const initialStatus: SmsConsentStatus = (contact.sms_consent_status as SmsConsentStatus) ?? 'no_reply';
  const [status, setStatus] = useState<SmsConsentStatus>(initialStatus);
  const [sourceUi, setSourceUi] = useState<SmsConsentSourceUi>('phone_call');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.contacts.updateSmsConsent(contact.id, {
        status,
        // Send the wire-format enum (phone_call / manual_entry), NOT the
        // human label — backend validates against a strict enum and 422s
        // on the label string.
        source: SMS_CONSENT_SOURCE_WIRE[sourceUi],
        notes: notes.trim() ? notes.trim() : null,
        recorded_by_staff_id: staffId,
      });
      await onSaved();
    } catch (err) {
      console.error('EditSmsConsentModal: failed to save', err);
      setError('Failed to save. Please try again.');
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit SMS preferences"
      subtitle={`${contact.first_name} ${contact.last_name}${contact.phone ? ` · ${contact.phone}` : ''}`}
      maxWidth="420px"
    >
      <div className={styles.body}>
        <div className={styles.field}>
          <span className={styles.label}>New status</span>
          <div className={styles.radioGrid} role="radiogroup" aria-label="New SMS consent status">
            {STATUS_OPTIONS.map((opt) => {
              const selected = status === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={[
                    styles.radioCard,
                    selected ? styles.radioCardSelected : '',
                    selected ? styles[`radioCardSelected_${opt.value}`] : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => setStatus(opt.value)}
                >
                  <span className={[styles.radioIcon, styles[`radioIcon_${opt.value}`]].join(' ')}>
                    {opt.value === 'sms_on' && <Check size={14} strokeWidth={3} />}
                    {opt.value === 'opted_out' && <X size={14} strokeWidth={3} />}
                    {opt.value === 'no_reply' && <Circle size={10} strokeWidth={3} />}
                  </span>
                  <span className={styles.radioText}>
                    <span className={styles.radioTitle}>{opt.title}</span>
                    <span className={styles.radioHint}>{opt.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="capture-source" className={styles.label}>How was consent captured?</label>
          <select
            id="capture-source"
            className={styles.select}
            value={sourceUi}
            onChange={(e) => setSourceUi(e.target.value as SmsConsentSourceUi)}
          >
            <option value="phone_call">{SMS_CONSENT_SOURCE_LABEL.phone_call}</option>
            <option value="manual_entry">{SMS_CONSENT_SOURCE_LABEL.manual_entry}</option>
            <option value="other">{SMS_CONSENT_SOURCE_LABEL.other}</option>
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="capture-notes" className={styles.label}>Notes (optional)</label>
          <textarea
            id="capture-notes"
            className={styles.textarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={`E.g., ${contact.first_name} called this morning asking to re-enable texts for pickup alerts...`}
            rows={3}
          />
        </div>

        {error && <p className={styles.error} role="alert">{error}</p>}

        <div className={styles.actions}>
          <button type="button" className={styles.btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
