'use client';

import { Phone } from 'lucide-react';
import styles from './SmsCallDisplay.module.css';

export interface SmsCallDisplayProps {
  /** "Mark Martinez" or any short identifier; rendered after the phone icon. */
  name: string;
  /** Display-formatted phone number, e.g. "(616) 555-2847". */
  phone: string | null | undefined;
  /**
   * Optional small label rendered above the call line (e.g. "SMS BLOCKED"
   * on the Attendance card variant per PDF section 11). Omit on the
   * standalone call-display in the SMS popup.
   */
  prefixLabel?: string;
  /** Optional className passthrough so call-sites can tighten or widen
   *  the outer block to fit their context (Attendance card uses a tighter
   *  variant than the modal). */
  className?: string;
}

/**
 * Amber call-display block used wherever an SMS path is unavailable and
 * staff must use the office phone instead. Shared shape across:
 *   - PDF section 4: bathroom button when parent is opted_out
 *   - PDF section 5/9: SMS popup opted_out variant (legacy inline impl)
 *   - PDF section 11: Attendance card blocked-send variant
 *
 * Non-interactive — Ops app has no dialer. Same minimum height as the
 * primary action it replaces so the row layout doesn't shift.
 */
export default function SmsCallDisplay({
  name,
  phone,
  prefixLabel,
  className,
}: SmsCallDisplayProps) {
  return (
    <div className={[styles.block, className].filter(Boolean).join(' ')} role="note">
      <Phone size={16} aria-hidden="true" className={styles.icon} />
      <div className={styles.text}>
        {prefixLabel && <span className={styles.prefix}>{prefixLabel}</span>}
        <span className={styles.title}>Call {name}</span>
        {phone && <span className={styles.phone}>{phone}</span>}
      </div>
    </div>
  );
}
