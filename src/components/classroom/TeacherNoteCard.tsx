'use client';

import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import styles from './TeacherNoteCard.module.css';

export interface TeacherNote {
  text: string;
  done: boolean;
}

export interface TeacherNoteCardProps {
  note: TeacherNote;
  /**
   * Action button click handler. Live Class fires "Mark done" on the active
   * row's flags; the check-in popup fires "Remove" to drop a staged note
   * before the row is committed. Same component, different action label.
   */
  onMarkDone: () => void;
  /** Override the default "Mark done" copy on the action button. Pass
   *  "Remove" from the check-in popup's staged-note list. */
  actionLabel?: string;
}

// TODO(86agzuwdf-phase5): Author label omitted. Current teacher notes data shape is
// { text, done } with no author field. To render "From {name}" per Row View FINAL spec
// section 4, the backend data contract must be extended to include author on each note
// record. Track this in a separate wiring ticket.
export default function TeacherNoteCard({ note, onMarkDone, actionLabel = 'Mark done' }: TeacherNoteCardProps) {
  return (
    <div className={`${styles.card} ${note.done ? styles.cardDone : ''}`}>
      <AlertTriangle size={18} className={styles.warnIcon} aria-hidden="true" />
      <div className={styles.content}>
        <p className={styles.text}>{note.text}</p>
        {note.done ? (
          <div className={styles.doneIndicator} role="status">
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>DONE</span>
          </div>
        ) : (
          <button
            type="button"
            className={styles.markBtn}
            onClick={onMarkDone}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
