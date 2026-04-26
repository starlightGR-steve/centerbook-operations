/**
 * SMS consent source enum mapping.
 *
 * The backend's PATCH /contacts/{id}/sms-consent endpoint validates the
 * `source` field against a strict enum (snake_case keys). The frontend
 * presents human-readable labels in the dropdown but must send the enum
 * value — sending the label causes a 422.
 *
 * Same map is used in reverse to render server-stored values back as
 * labels on the SmsPreferencesCard (SOURCE row + history list). Unknown
 * values pass through verbatim so server-generated sources we don't have
 * a translation for (e.g. inbound STOP replies that store free-text)
 * still render readably.
 */

export type SmsConsentSourceUi = 'phone_call' | 'manual_entry' | 'other';

/** Wire-format enum the backend accepts on PATCH. "Other" collapses to
 *  manual_entry per Nicole — closest existing bucket. */
export const SMS_CONSENT_SOURCE_WIRE: Record<SmsConsentSourceUi, string> = {
  phone_call: 'phone_call',
  manual_entry: 'manual_entry',
  other: 'manual_entry',
};

/** UI labels — what staff sees in the dropdown. */
export const SMS_CONSENT_SOURCE_LABEL: Record<SmsConsentSourceUi, string> = {
  phone_call: 'Phone call with parent',
  manual_entry: 'Manual entry',
  other: 'Other',
};

/** Reverse map for display — converts a stored enum back to its human
 *  label. Falls through to the input string when not recognized so
 *  server-side sources we don't know about still render readably. */
const DISPLAY_LABEL: Record<string, string> = {
  phone_call: 'Phone call with parent',
  manual_entry: 'Manual entry',
};

export function formatSmsConsentSource(source: string | null | undefined): string {
  if (!source) return '—';
  return DISPLAY_LABEL[source] ?? source;
}
