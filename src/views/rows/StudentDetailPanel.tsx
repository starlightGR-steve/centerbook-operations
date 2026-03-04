'use client';

import { useState } from 'react';
import { X, Send, FileText, BookOpen } from 'lucide-react';
import NoteCard from '@/components/NoteCard';
import EmptyState from '@/components/ui/EmptyState';
import SmsStatusIndicator from '@/components/SmsStatusIndicator';
import type { Student, Attendance } from '@/lib/types';
import { useNotes, createNote } from '@/hooks/useNotes';
import { useOutstandingLoans } from '@/hooks/useLibrary';
import styles from './StudentDetailPanel.module.css';

interface StudentDetailPanelProps {
  student: Student;
  attendance: Attendance | undefined;
  onClose: () => void;
}

export default function StudentDetailPanel({
  student,
  attendance,
  onClose,
}: StudentDetailPanelProps) {
  const [noteText, setNoteText] = useState('');
  const today = new Date().toISOString().split('T')[0];
  const { data: notes } = useNotes(student.id, today);
  const { data: allLoans } = useOutstandingLoans();

  const studentLoans = allLoans?.filter((l) => l.student_id === student.id);

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    await createNote({
      student_id: student.id,
      content: noteText.trim(),
      author_type: 'staff',
      author_name: 'You',
      note_date: today,
      visibility: 'staff',
    });
    setNoteText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddNote();
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.avatar}>{student.first_name[0]}</div>
          <div>
            <h3 className={styles.headerName}>
              {student.first_name} {student.last_name}
            </h3>
            <p className={styles.headerSub}>
              Student #{String(student.id).padStart(3, '0')}
            </p>
          </div>
        </div>
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className={styles.body}>
        {/* SMS Status */}
        {attendance && attendance.sms_10min_sent && (
          <SmsStatusIndicator attendance={attendance} variant="detail" />
        )}

        {/* Daily Observation */}
        <div>
          <label className={styles.label}>Daily Observation</label>
          <div className={styles.noteInputWrap}>
            <textarea
              className={styles.noteInput}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type observation notes..."
            />
            <button className={styles.sendBtn} onClick={handleAddNote}>
              <Send size={14} />
            </button>
          </div>
        </div>

        {/* Notes History */}
        <div>
          <label className={`${styles.label} ${styles.labelSpaced}`}>
            Notes History
          </label>
          <div className={styles.notesFeed}>
            {notes && notes.length > 0 ? (
              notes.map((n) => <NoteCard key={n.id} note={n} />)
            ) : (
              <EmptyState icon={FileText} title="No notes yet" description="Add an observation above" />
            )}
          </div>
        </div>

        {/* Levels */}
        <div className={styles.levels}>
          <div className={`${styles.levelCard} ${styles.levelMath}`}>
            <p className={`${styles.levelLabel} ${styles.levelLabelMath}`}>
              Math Level
            </p>
            <p className={`${styles.levelValue} ${styles.levelValueMath}`}>
              {student.current_level_math || '—'}
            </p>
          </div>
          <div className={`${styles.levelCard} ${styles.levelReading}`}>
            <p className={`${styles.levelLabel} ${styles.levelLabelReading}`}>
              Reading Level
            </p>
            <p className={`${styles.levelValue} ${styles.levelValueReading}`}>
              {student.current_level_reading || '—'}
            </p>
          </div>
        </div>

        {/* Library Books */}
        <div>
          <label className={styles.label}>Library Books</label>
          {studentLoans && studentLoans.length > 0 ? (
            studentLoans.map((l) => (
              <div key={l.id} className={styles.bookRow}>
                <span className={styles.bookTitle}>
                  {l.book?.title || `Book #${l.book_id}`}
                </span>
                <span className={styles.bookBadge}>Borrowed</span>
              </div>
            ))
          ) : (
            <EmptyState icon={BookOpen} title="No active loans" />
          )}
        </div>
      </div>
    </div>
  );
}
