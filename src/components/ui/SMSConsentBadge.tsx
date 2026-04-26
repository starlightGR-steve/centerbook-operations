'use client';

import { Check } from 'lucide-react';
import type { SmsConsentStatus } from '@/lib/types';
import styles from './SMSConsentBadge.module.css';

export type SMSConsentBadgeSize = 'medium' | 'large';

export interface SMSConsentBadgeProps {
  /** Three-state consent value. Pass undefined/null to render nothing
   *  (callers that need a "loading" state should handle that themselves). */
  status: SmsConsentStatus | null | undefined;
  /** medium → table rows, dropdown options, parent cards.
   *  large  → page headers, contact preferences card. */
  size?: SMSConsentBadgeSize;
  /** Optional className passthrough for layout tweaks at call sites. */
  className?: string;
}

const LABEL: Record<SmsConsentStatus, string> = {
  sms_on: 'SMS on',
  opted_out: 'Opted out',
  no_reply: 'No reply',
};

/**
 * Presentational badge for the three-state SMS consent. Reads `status` from
 * a typed prop — no fetch, no SWR, no state. Visual contract per the SMS
 * consent design system PDF (sections 1 + 2): icon-or-dot + label, three
 * tones (green / amber / neutral) at two sizes (medium / large).
 */
export default function SMSConsentBadge({
  status,
  size = 'medium',
  className,
}: SMSConsentBadgeProps) {
  if (!status) return null;
  const sizeClass = size === 'large' ? styles.large : styles.medium;
  const stateClass = styles[`state_${status}`];
  return (
    <span
      className={[styles.badge, sizeClass, stateClass, className].filter(Boolean).join(' ')}
      role="status"
      aria-label={LABEL[status]}
    >
      {status === 'sms_on' && (
        <Check className={styles.icon} size={size === 'large' ? 14 : 12} strokeWidth={2.5} aria-hidden="true" />
      )}
      {status === 'no_reply' && (
        <span className={styles.dot} aria-hidden="true" />
      )}
      <span className={styles.label}>{LABEL[status]}</span>
    </span>
  );
}
