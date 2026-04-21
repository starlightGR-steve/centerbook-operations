'use client';

import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import styles from './TeacherNoteCard.module.css';

export interface TeacherNote {
  id: string;
  author: string;
  text: string;
  done: boolean;
  createdAt: string;
}

export interface TeacherNoteCardProps {
  note: TeacherNote;
  onMarkDone: (noteId: string) => void;
}

export default function TeacherNoteCard({ note, onMarkDone }: TeacherNoteCardProps) {
  return (
    <div className={`${styles.card} ${note.done ? styles.cardDone : ''}`}>
      <div className={styles.headerRow}>
        <AlertTriangle size={18} className={styles.warnIcon} aria-hidden="true" />
        <span className={styles.fromLabel}>FROM {note.author.toUpperCase()}</span>
      </div>
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
          onClick={() => onMarkDone(note.id)}
        >
          Mark done
        </button>
      )}
    </div>
  );
}
