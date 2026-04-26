'use client';

import { useState } from 'react';
import { mutate as globalMutate } from 'swr';
import type { Contact, SmsConsentStatus } from '@/lib/types';
import SmsCallDisplay from '@/components/ui/SmsCallDisplay';
import ConsentCaptureModal from './ConsentCaptureModal';
import styles from './SmsTriggerButton.module.css';

export interface SmsTriggerButtonProps {
  /** The parent the SMS would route to. Drives the three-state render via
   *  parent.sms_consent_status. */
  parent: Contact | null | undefined;
  /** Student first name — used in the consent modal header. */
  studentFirstName: string;
  /** Label for the send button when SMS is on (e.g. "Send bathroom text",
   *  "Send progress meeting message"). */
  sendLabel: string;
  /** Optional icon node rendered before the send label. */
  sendIcon?: React.ReactNode;
  /** Fired when status === 'sms_on' and the staff taps the send button.
   *  Caller owns the actual API call (POST /sms/bathroom-request, etc.). */
  onSend: () => void | Promise<void>;
  /** True while the caller's send is in flight. Disables the button so
   *  staff can't double-tap. */
  sending?: boolean;
  /** Wire-format consent source for any PATCH triggered from the
   *  capture modal. Defaults to 'manual_entry'. */
  captureSource?: string;
  /** Optional className passthrough so call-sites can constrain widths. */
  className?: string;
}

/**
 * Three-state SMS trigger pattern (PDF section 4). Shared between the
 * bathroom button (Live Class detail panel) and the progress meeting
 * message button (student record). Future broadcast features will plug
 * in the same way.
 *
 * Renders one of:
 *   sms_on    → primary action button with sendLabel + onSend
 *   opted_out → SmsCallDisplay (non-interactive, "Call <Parent>")
 *   no_reply  → "Get consent" outlined button → opens ConsentCaptureModal
 *
 * Reading the parent's status drives the render; status changes from
 * the consent modal trigger an SWR revalidation of contact-${id} so the
 * button refreshes on the next render cycle.
 */
export default function SmsTriggerButton({
  parent,
  studentFirstName,
  sendLabel,
  sendIcon,
  onSend,
  sending,
  captureSource = 'manual_entry',
  className,
}: SmsTriggerButtonProps) {
  const [captureOpen, setCaptureOpen] = useState(false);

  if (!parent) {
    // Defensive: caller passed nothing — render a disabled stand-in so
    // layout doesn't shift but no action is reachable.
    return (
      <button type="button" className={`${styles.btn} ${styles.btnSend}`} disabled>
        {sendLabel}
      </button>
    );
  }

  const status: SmsConsentStatus = (parent.sms_consent_status as SmsConsentStatus) ?? 'no_reply';
  const fullName = `${parent.first_name} ${parent.last_name}`.trim();

  if (status === 'opted_out') {
    return (
      <SmsCallDisplay
        name={fullName}
        phone={parent.phone}
        className={className}
      />
    );
  }

  if (status === 'no_reply') {
    return (
      <>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnGhost} ${className ?? ''}`}
          onClick={() => setCaptureOpen(true)}
        >
          Get consent
        </button>
        {captureOpen && (
          <ConsentCaptureModal
            studentFirstName={studentFirstName}
            parent={parent}
            source={captureSource}
            onClose={() => setCaptureOpen(false)}
            onSaved={async () => {
              setCaptureOpen(false);
              // Revalidate the single-contact key so the button picks up
              // the new status on the next render. Other display surfaces
              // (badges across pages) revalidate via their own SWR polls
              // or shared 'contacts' / 'student-${id}' keys.
              await globalMutate(`contact-${parent.id}`);
            }}
          />
        )}
      </>
    );
  }

  // status === 'sms_on'
  return (
    <button
      type="button"
      className={`${styles.btn} ${styles.btnSend} ${className ?? ''}`}
      onClick={onSend}
      disabled={!!sending}
    >
      {sendIcon}
      {sending ? 'Sending…' : sendLabel}
    </button>
  );
}
