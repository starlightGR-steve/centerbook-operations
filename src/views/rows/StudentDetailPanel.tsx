'use client';

import { useState } from 'react';
import { X, Send, FileText, BookOpen, Heart } from 'lucide-react';
import NoteCard from '@/components/NoteCard';
import PosBadge from '@/components/PosBadge';
import VisibilityLabel from '@/components/VisibilityLabel';
import SubjectBadges from '@/components/SubjectBadges';
import EmptyState from '@/components/ui/EmptyState';
import SmsStatusIndicator from '@/components/SmsStatusIndicator';
import type { Student, Attendance, NoteVisibility } from '@/lib/types';
import { parseSubjects, parseScheduleDays, formatTimeKey } from '@/lib/types';
import { useNotes, createNote } from '@/hooks/useNotes';
import { useOutstandingLoans } from '@/hooks/useLibrary';
import styles from './StudentDetailPanel.module.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday'];

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
  const [noteVis, setNoteVis] = useState<NoteVisibility>('staff');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const today = new Date().toISOString().split('T')[0];
  const { data: notes } = useNotes(student.id, today);
  const { data: allLoans } = useOutstandingLoans();

  const studentLoans = allLoans?.filter((l) => l.student_id === student.id);
  const scheduleDays = parseScheduleDays(student.class_schedule_days);

  const handleAddNote = async () => {
    if (!noteText.trim() || noteSaving) return;
    setNoteSaving(true);
    setNoteError(null);
    try {
      await createNote({
        student_id: student.id,
        content: noteText.trim(),
        author_type: 'staff',
        author_name: 'You',
        note_date: today,
        visibility: noteVis,
      });
      setNoteText('');
    } catch {
      setNoteError('Failed to save note. Please try again.');
    } finally {
      setNoteSaving(false);
    }
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
              Grade {student.grade_level || '—'} · {student.program_type || 'Paper'}
            </p>
          </div>
        </div>
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className={styles.body}>
        {/* Quick info badges */}
        <div className={styles.quickBadges}>
          {student.classroom_position && (
            <PosBadge position={student.classroom_position} />
          )}
          <SubjectBadges subjects={parseSubjects(student.subjects)} />
          <span className={styles.infoBadge}>{student.program_type || 'Paper'}</span>
          <span className={styles.infoBadge}>Grade {student.grade_level || '—'}</span>
        </div>

        {/* Medical alert */}
        {student.medical_notes && (
          <div className={styles.medicalAlert}>
            <Heart size={16} color="var(--red)" />
            <div>
              <p className={styles.medicalTitle}>Medical / Allergies</p>
              <p className={styles.medicalText}>{student.medical_notes}</p>
            </div>
          </div>
        )}

        {/* Schedule */}
        <div>
          <label className={styles.label}>Schedule</label>
          <div className={styles.scheduleDays}>
            {DAYS.map((d) => (
              <span
                key={d}
                className={`${styles.dayBadge} ${
                  scheduleDays.includes(d) ? styles.dayBadgeActive : ''
                }`}
              >
                {d.slice(0, 3)}
              </span>
            ))}
            {student.class_time_sort_key && (
              <span className={styles.timeBadge}>
                {formatTimeKey(student.class_time_sort_key)}
              </span>
            )}
          </div>
        </div>

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
            <div className={styles.noteActions}>
              <div className={styles.visSelector}>
                {(['staff', 'parent', 'internal'] as NoteVisibility[]).map((v) => (
                  <button
                    key={v}
                    className={`${styles.visBtn} ${noteVis === v ? styles.visBtnActive : ''}`}
                    onClick={() => setNoteVis(v)}
                    type="button"
                  >
                    <VisibilityLabel visibility={v} />
                  </button>
                ))}
              </div>
              <button className={styles.sendBtn} onClick={handleAddNote} disabled={noteSaving}>
                {noteSaving ? (
                  <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite' }} />
                ) : (
                  <Send size={14} />
                )}
              </button>
            </div>
            {noteError && (
              <p style={{ color: 'var(--red)', fontSize: 11, margin: '4px 0 0', fontFamily: 'var(--font-primary)' }}>{noteError}</p>
            )}
          </div>
        </div>

        {/* Notes History */}
        <div>
          <label className={`${styles.label} ${styles.labelSpaced}`}>
            Notes History
          </label>
          <div className={styles.notesFeed}>
            {notes && notes.length > 0 ? (
              notes.map((n) => (
                <div key={n.id}>
                  <div className={styles.noteVisRow}>
                    <VisibilityLabel visibility={n.visibility} />
                  </div>
                  <NoteCard note={n} />
                </div>
              ))
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
