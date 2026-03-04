import type { StudentNote } from '@/lib/types';
import { formatTime } from '@/lib/types';
import styles from './NoteCard.module.css';

interface NoteCardProps {
  note: StudentNote;
}

const SOURCE_LABELS: Record<string, string> = {
  portal: 'Parent Portal',
  admin: 'Admin',
  staff: 'Staff',
};

export default function NoteCard({ note }: NoteCardProps) {
  const cardStyle =
    note.author_type === 'portal'
      ? styles.cardPortal
      : note.author_type === 'admin'
        ? styles.cardAdmin
        : styles.cardStaff;

  const badgeStyle =
    note.author_type === 'portal'
      ? styles.sourceBadgePortal
      : note.author_type === 'admin'
        ? styles.sourceBadgeAdmin
        : styles.sourceBadgeStaff;

  return (
    <div className={`${styles.card} ${cardStyle}`}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={`${styles.sourceBadge} ${badgeStyle}`}>
            {SOURCE_LABELS[note.author_type] || note.author_type}
          </span>
          <span className={styles.author}>{note.author_name}</span>
        </div>
        <span className={styles.timestamp}>{formatTime(note.created_at)}</span>
      </div>
      <p className={styles.content}>{note.content}</p>
    </div>
  );
}
