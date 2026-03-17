'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { X, Send, FileText, BookOpen, Heart, Lock } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import SmsStatusIndicator from '@/components/SmsStatusIndicator';
import type { Student, Attendance, NoteVisibility } from '@/lib/types';
import { parseSubjects, parseScheduleDays, formatTimeKey } from '@/lib/types';
import { useNotes, createNote } from '@/hooks/useNotes';
import { useOutstandingLoans } from '@/hooks/useLibrary';
import styles from './StudentDetailPanel.module.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday'];

const VIS_OPTIONS: { value: NoteVisibility; label: string; icon?: boolean }[] = [
  { value: 'internal', label: 'Management Only', icon: true },
  { value: 'staff', label: 'Teacher Visible' },
  { value: 'parent', label: 'Parent Visible' },
];

function formatNoteDate(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.toLocaleString('en-US', { month: 'short' });
  const day = d.getDate();
  const time = d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${month} ${day}, ${time}`;
}

function visibilityBadgeClass(vis: string): string {
  if (vis === 'internal') return styles.visBadgeInternal;
  if (vis === 'parent') return styles.visBadgeParent;
  return styles.visBadgeStaff;
}

function visibilityLabel(vis: string): string {
  if (vis === 'internal') return 'Management Only';
  if (vis === 'parent') return 'Parent Visible';
  return 'Teacher Visible';
}

function roleBadgeClass(vis: string): string {
  if (vis === 'parent') return styles.roleBadgeParent;
  if (vis === 'internal') return styles.roleBadgeAdmin;
  return styles.roleBadgeStaff;
}

function roleLabel(vis: string): string {
  if (vis === 'parent') return 'Parent Portal';
  if (vis === 'internal') return 'Admin';
  return 'Staff';
}

interface StudentDetailPanelProps {
  student: Student;
  attendance: Attendance | undefined;
  rowLabel?: string;
  onClose: () => void;
}

export default function StudentDetailPanel({
  student,
  attendance,
  rowLabel,
  onClose,
}: StudentDetailPanelProps) {
  const { data: session } = useSession();
  const staffId = Number((session?.user as { id?: string } | undefined)?.id) || 0;
  const [noteText, setNoteText] = useState('');
  const [noteVis, setNoteVis] = useState<NoteVisibility>('staff');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const today = new Date().toISOString().split('T')[0];
  const { data: notes } = useNotes(student.id, today);
  const { data: allLoans } = useOutstandingLoans();

  const studentLoans = allLoans?.filter((l) => l.student_id === student.id);
  const scheduleDays = parseScheduleDays(student.class_schedule_days);
  const subjects = parseSubjects(student.subjects);

  const handleAddNote = async () => {
    if (!noteText.trim() || noteSaving) return;
    setNoteSaving(true);
    setNoteError(null);
    try {
      await createNote({
        student_id: student.id,
        content: noteText.trim(),
        author_type: 'staff',
        author_name: session?.user?.name || 'Staff',
        author_id: staffId,
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
      {/* 1. Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.avatar}>{student.first_name[0]}</div>
          <div>
            <h3 className={styles.headerName}>
              {student.first_name} {student.last_name}
            </h3>
            <p className={styles.headerSub}>
              {rowLabel || 'Row'} · Grade {student.grade_level || '—'} · {student.program_type || 'Paper'}
            </p>
          </div>
        </div>
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className={styles.body}>
        {/* 2. Badge row */}
        <div className={styles.badgeRow}>
          {student.classroom_position && (
            <span className={styles.posBadge}>{student.classroom_position}</span>
          )}
          {subjects.includes('Math') && (
            <span className={styles.levelBadgeMath}>
              Math {student.current_level_math || ''}
            </span>
          )}
          {subjects.includes('Reading') && (
            <span className={styles.levelBadgeReading}>
              Reading {student.current_level_reading || ''}
            </span>
          )}
          {student.program_type === 'Kumon Connect' && (
            <span className={styles.kcBadge}>KC</span>
          )}
          <span className={styles.gradeBadge}>Grade {student.grade_level || '—'}</span>
        </div>

        {/* SMS Status */}
        {attendance && attendance.sms_10min_sent && (
          <SmsStatusIndicator attendance={attendance} variant="detail" />
        )}

        {/* 3. Schedule */}
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

        {/* 4. Add Note */}
        <div>
          <label className={styles.label}>Add Note</label>
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
                {VIS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`${styles.visBtn} ${noteVis === opt.value ? styles.visBtnActive : ''}`}
                    onClick={() => setNoteVis(opt.value)}
                    type="button"
                  >
                    {opt.icon && <Lock size={10} />}
                    {opt.label}
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

        {/* 5. Notes History */}
        <div>
          <label className={`${styles.label} ${styles.labelSpaced}`}>
            Notes History
          </label>
          <div className={styles.notesFeed}>
            {notes && notes.length > 0 ? (
              notes.map((n) => (
                <div key={n.id} className={styles.noteCard}>
                  <div className={styles.noteCardHeader}>
                    <div className={styles.noteCardLeft}>
                      <span className={roleBadgeClass(n.visibility)}>
                        {roleLabel(n.visibility)}
                      </span>
                      <span className={styles.noteAuthorName}>
                        {n.author_name || 'Staff'}
                      </span>
                    </div>
                    <div className={styles.noteCardRight}>
                      <span className={visibilityBadgeClass(n.visibility)}>
                        {n.visibility === 'internal' && <Lock size={9} />}
                        {visibilityLabel(n.visibility)}
                      </span>
                      <span className={styles.noteDate}>
                        {formatNoteDate(n.created_at)}
                      </span>
                    </div>
                  </div>
                  <p className={styles.noteContent}>{n.content}</p>
                </div>
              ))
            ) : (
              <EmptyState icon={FileText} title="No notes yet" description="Add an observation above" />
            )}
          </div>
        </div>

        {/* 6. Library Books */}
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
            <EmptyState icon={BookOpen} title="No checked out items" />
          )}
        </div>

        {/* 7. Medical Alert (moved to bottom) */}
        {student.medical_notes && (
          <div className={styles.medicalAlert}>
            <Heart size={16} color="var(--red)" />
            <div>
              <p className={styles.medicalTitle}>Medical / Allergies</p>
              <p className={styles.medicalText}>{student.medical_notes}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
