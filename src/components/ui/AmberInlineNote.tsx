'use client';

import styles from './AmberInlineNote.module.css';

export interface AmberInlineNoteProps {
  /** Short text rendered inline next to a small amber dot. */
  children: React.ReactNode;
  className?: string;
}

/**
 * Inline amber dot + text used in two SMS-consent surfaces (PDF sections 8
 * and 9): the student profile metadata "Primary comm parent not reachable
 * by SMS" warning, and the students roster alt-parent hint. Same amber as
 * the Opted out badge, but rendered as low-weight inline text rather than
 * a pill so it sits naturally inside an existing metadata row.
 */
export default function AmberInlineNote({ children, className }: AmberInlineNoteProps) {
  return (
    <span className={[styles.note, className].filter(Boolean).join(' ')}>
      <span className={styles.dot} aria-hidden="true" />
      <span>{children}</span>
    </span>
  );
}
