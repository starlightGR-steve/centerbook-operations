'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import type { Contact, SmsConsentHistoryEntry, SmsConsentStatus } from '@/lib/types';
import SMSConsentBadge from '@/components/ui/SMSConsentBadge';
import EditSmsConsentModal from './EditSmsConsentModal';
import styles from './SmsPreferencesCard.module.css';

export interface SmsPreferencesCardProps {
  contact: Contact;
  /** Callback after a successful PATCH. Parent uses this to mutate the
   *  contact-${id} SWR cache so the new status renders immediately. */
  onAfterSave: () => void;
}

const ACTION_VERB: Record<SmsConsentHistoryEntry['action'], string> = {
  opted_in: 'Opted in',
  opted_out: 'Opted out',
  cleared: 'Cleared',
};

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso.includes(' ') ? iso.replace(' ', 'T') : iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatHistoryTimestamp(iso: string): string {
  const d = new Date(iso.includes(' ') ? iso.replace(' ', 'T') : iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Source-of-truth card for SMS consent on the contact profile (PDF section 7).
 * Replaces the legacy sms_opt_in checkbox in the Communication Preferences
 * section. Renders the current status badge, source + recorded-by metadata,
 * a collapsible history log, and an Edit status button that opens the
 * EditSmsConsentModal.
 */
export default function SmsPreferencesCard({ contact, onAfterSave }: SmsPreferencesCardProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // History fetch — lazy, only when the section is expanded.
  const { data: history, isLoading: historyLoading, mutate: mutateHistory } = useSWR<SmsConsentHistoryEntry[]>(
    historyOpen ? `contact-sms-history-${contact.id}` : null,
    () => api.contacts.smsConsentHistory(contact.id),
    { dedupingInterval: 5000 },
  );

  // Pre-fetch the count too — backend returns the full list, so we read
  // length from the same data source. To avoid an extra round-trip the entry
  // count is shown only after the user opens the history.
  const entryCount = history?.length;

  const status: SmsConsentStatus = (contact.sms_consent_status as SmsConsentStatus) ?? 'no_reply';

  return (
    <section className={styles.card} aria-labelledby="sms-prefs-heading">
      <h3 id="sms-prefs-heading" className={styles.heading}>SMS preferences</h3>

      <div className={styles.statusBlock}>
        <div className={styles.statusLeft}>
          <span className={styles.statusLabel}>CURRENT STATUS</span>
          <div className={styles.statusRow}>
            <SMSConsentBadge status={status} size="large" />
            {contact.sms_consent_updated_at && (
              <span className={styles.updatedText}>
                Updated {formatTimestamp(contact.sms_consent_updated_at)}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          className={styles.editBtn}
          onClick={() => setEditOpen(true)}
        >
          Edit status
        </button>
      </div>

      <div className={styles.metaGrid}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>SOURCE</span>
          <span className={styles.metaValue}>{contact.sms_consent_source || '—'}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>RECORDED BY</span>
          <span className={styles.metaValue}>{contact.sms_consent_recorded_by || 'System'}</span>
        </div>
      </div>

      <button
        type="button"
        className={styles.historyToggle}
        onClick={() => setHistoryOpen((v) => !v)}
        aria-expanded={historyOpen}
      >
        <span>View consent history</span>
        <span className={styles.historyToggleRight}>
          {entryCount !== undefined && (
            <span className={styles.entryCountPill}>{entryCount} entries</span>
          )}
          {historyOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {historyOpen && (
        <div className={styles.historyBlock}>
          <div className={styles.historyHeader}>
            <span className={styles.historyHeaderLabel}>CONSENT HISTORY</span>
            <span className={styles.historyHeaderHint}>Immutable — compliance record</span>
          </div>
          {historyLoading && <p className={styles.historyEmpty}>Loading history…</p>}
          {!historyLoading && (!history || history.length === 0) && (
            <p className={styles.historyEmpty}>No consent changes recorded yet.</p>
          )}
          {history && history.length > 0 && (
            <ol className={styles.historyList}>
              {history.map((entry) => (
                <li key={entry.id} className={styles.historyEntry}>
                  <div className={styles.historyTimestamp}>{formatHistoryTimestamp(entry.created_at)}</div>
                  <div className={styles.historyBody}>
                    <div className={styles.historyAction}>{ACTION_VERB[entry.action] ?? entry.action}</div>
                    <div className={styles.historySource}>{entry.notes || entry.source}</div>
                  </div>
                  <div className={styles.historyActor}>{entry.recorded_by || 'System'}</div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {editOpen && (
        <EditSmsConsentModal
          contact={contact}
          onClose={() => setEditOpen(false)}
          onSaved={async () => {
            setEditOpen(false);
            // Bring the history into view after a successful save so the new
            // entry is visible immediately (Nicole's verification step 2 calls
            // this out specifically — "confirm a SECOND history entry appears").
            setHistoryOpen(true);
            await mutateHistory();
            onAfterSave();
          }}
        />
      )}
    </section>
  );
}
