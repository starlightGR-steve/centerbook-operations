'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  X, BookOpen, Heart, AlertTriangle, Check, ArrowRight, Pencil, Plus,
  Lightbulb, CircleHelp, Star, AlertCircle, Zap, Flag, UserCheck, Sparkles,
} from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import SmsStatusIndicator from '@/components/SmsStatusIndicator';
import type { AppRole } from '@/lib/auth';
import type { Student, Attendance, RowAssignmentFlags } from '@/lib/types';
import { parseSubjects, parseScheduleDays, formatTimeKey } from '@/lib/types';
import { useClassroomNotes, createClassroomNote } from '@/hooks/useClassroomNotes';
import { useOutstandingLoans } from '@/hooks/useLibrary';
import { useFlagConfig, useChecklistConfig } from '@/hooks/useFlagConfig';
import styles from './StudentDetailPanel.module.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday'];

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function FlagIcon({ icon, size = 12 }: { icon: string; size?: number }) {
  if (icon.startsWith('text:')) {
    return <span className={styles.flagIconText}>{icon.slice(5)}</span>;
  }
  const props = { size, color: '#fff' };
  switch (icon) {
    case 'Lightbulb': return <Lightbulb {...props} />;
    case 'CircleHelp': return <CircleHelp {...props} />;
    case 'BookOpen': return <BookOpen {...props} />;
    case 'Star': return <Star {...props} />;
    case 'AlertCircle': return <AlertCircle {...props} />;
    case 'Zap': return <Zap {...props} />;
    case 'Flag': return <Flag {...props} />;
    case 'Heart': return <Heart {...props} />;
    case 'UserCheck': return <UserCheck {...props} />;
    case 'Sparkles': return <Sparkles {...props} />;
    default: return <Flag {...props} />;
  }
}

interface StudentDetailPanelProps {
  student: Student;
  attendance: Attendance | undefined;
  rowLabel?: string;
  flags?: RowAssignmentFlags | null;
  onToggleFlag?: (key: string) => void;
  onToggleTask?: (key: string) => void;
  onSetTeacherNote?: (note: string | null) => void;
  onClose: () => void;
}

export default function StudentDetailPanel({
  student,
  attendance,
  rowLabel,
  flags,
  onToggleFlag,
  onToggleTask,
  onSetTeacherNote,
  onClose,
}: StudentDetailPanelProps) {
  const { data: session } = useSession();
  const staffId = Number((session?.user as { id?: string } | undefined)?.id) || 0;
  const role = (session?.user as { role?: AppRole } | undefined)?.role;
  const isAdmin = role === 'admin' || role === 'superuser';
  const canWriteNote = role === 'admin' || role === 'superuser';
  const [noteText, setNoteText] = useState('');
  const [needsAttention, setNeedsAttention] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteSuccess, setNoteSuccess] = useState(false);
  const [teacherNoteInput, setTeacherNoteInput] = useState(flags?.teacher_note ?? '');
  const [editingNote, setEditingNote] = useState(false);
  const { data: classroomNotes, mutate: mutateNotes } = useClassroomNotes(student.id);
  const { data: allLoans } = useOutstandingLoans();
  const { flags: flagConfig } = useFlagConfig();
  const { items: checklistConfig } = useChecklistConfig();

  // Mobile: intercept device back button to close this panel instead of navigating away
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(max-width: 768px)').matches) return;
    // Push a history entry so the back gesture lands here first
    window.history.pushState({ detailPanel: true }, '');
    const handlePopState = () => onClose();
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      // If panel closed via X (not back gesture), consume the extra history entry
      if (window.history.state?.detailPanel) {
        window.history.back();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync teacher note input with flags prop (student switch or flag update)
  useEffect(() => {
    if (!editingNote) {
      setTeacherNoteInput(flags?.teacher_note ?? '');
    }
  }, [student.id, flags?.teacher_note, editingNote]);

  const studentLoans = allLoans?.filter((l) => l.student_id === student.id);
  const scheduleDays = parseScheduleDays(student.class_schedule_days);
  const subjects = parseSubjects(student.subjects);

  const handleSaveNote = async () => {
    if (!noteText.trim() || noteSaving) return;
    setNoteSaving(true);
    setNoteError(null);
    setNoteSuccess(false);
    try {
      const newNote = await createClassroomNote({
        student_id: student.id,
        note_text: noteText.trim(),
        author_id: staffId,
        needs_management_attention: needsAttention,
      });
      setNoteText('');
      setNeedsAttention(false);
      setNoteSuccess(true);
      setTimeout(() => setNoteSuccess(false), 3000);
      mutateNotes(
        (prev) => (prev ? [newNote, ...prev] : [newNote]),
        false
      );
    } catch {
      setNoteError('Failed to save note. Please try again.');
    } finally {
      setNoteSaving(false);
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

      {isAdmin && (
        <Link
          href={`/students/${student.id}`}
          className={styles.profileLink}
          onClick={onClose}
        >
          View Full Profile <ArrowRight size={14} />
        </Link>
      )}

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

        {/* 3. Medical / Allergies */}
        {student.medical_notes && (
          <div className={styles.medicalAlert}>
            <Heart size={16} color="var(--red)" />
            <div>
              <p className={styles.medicalTitle}>Medical / Allergies</p>
              <p className={styles.medicalText}>{student.medical_notes}</p>
            </div>
          </div>
        )}

        {/* 4. Schedule */}
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

        {/* 5. During Class */}
        <div className={styles.duringClassSection}>
          <label className={styles.duringClassHeading}>During Class</label>

          {/* Flag toggles */}
          <div className={styles.flagGrid}>
            {flagConfig.map((fc) => {
              const isActive = !!(flags && (flags as Record<string, unknown>)[fc.key]);
              return (
                <button
                  key={fc.key}
                  className={`${styles.flagToggleRow} ${isActive ? styles.flagToggleRowActive : ''}`}
                  onClick={() => onToggleFlag?.(fc.key)}
                  disabled={!onToggleFlag}
                >
                  <span
                    className={styles.flagCircleLg}
                    style={isActive ? { background: fc.color } : undefined}
                  >
                    <FlagIcon icon={fc.icon} size={12} />
                  </span>
                  <span className={styles.flagToggleLabel}>{fc.label}</span>
                  {isActive && <Check size={14} style={{ color: fc.color, flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>

          {/* Checklist */}
          {checklistConfig.length > 0 && (
            <div className={styles.checklistGrid}>
              {checklistConfig.map((ci) => {
                const val = flags?.tasks ? (flags.tasks as Record<string, unknown>)[ci.key] : undefined;
                const isAssigned = val !== undefined && val !== null;
                const isDone = val === true;
                return (
                  <button
                    key={ci.key}
                    className={`${styles.checklistRow} ${isDone ? styles.checklistRowDone : isAssigned ? styles.checklistRowAssigned : ''}`}
                    onClick={() => onToggleTask?.(ci.key)}
                    disabled={!onToggleTask}
                  >
                    <span className={`${styles.checkBox} ${isDone ? styles.checkBoxChecked : isAssigned ? styles.checkBoxAssigned : ''}`}>
                      {isDone && <Check size={9} color="var(--white)" />}
                    </span>
                    <span className={`${styles.checklistLabel} ${isDone ? styles.checklistLabelDone : ''}`}>
                      {ci.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Teacher Note */}
          <div className={styles.teacherNoteWrap}>
            <p className={styles.teacherNoteLabel}>Teacher Note</p>
            {editingNote && canWriteNote ? (
              <div className={styles.teacherNoteForm}>
                <textarea
                  className={styles.teacherNoteInput}
                  value={teacherNoteInput}
                  onChange={(e) => setTeacherNoteInput(e.target.value)}
                  rows={3}
                  placeholder="Instruction note for this student..."
                  autoFocus
                />
                <div className={styles.teacherNoteFormActions}>
                  <button
                    className={styles.teacherNoteSaveBtn}
                    onClick={() => {
                      onSetTeacherNote?.(teacherNoteInput.trim() || null);
                      setEditingNote(false);
                    }}
                  >
                    Save
                  </button>
                  <button
                    className={styles.teacherNoteCancelBtn}
                    onClick={() => {
                      setTeacherNoteInput(flags?.teacher_note ?? '');
                      setEditingNote(false);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : flags?.teacher_note ? (
              <div className={styles.teacherNoteCard}>
                <p className={styles.teacherNoteText}>{flags.teacher_note}</p>
                {canWriteNote && (
                  <div className={styles.teacherNoteCardActions}>
                    <button
                      className={styles.teacherNoteIconBtn}
                      onClick={() => { setTeacherNoteInput(flags.teacher_note ?? ''); setEditingNote(true); }}
                      aria-label="Edit note"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      className={styles.teacherNoteIconBtn}
                      onClick={() => { setTeacherNoteInput(''); onSetTeacherNote?.(null); }}
                      aria-label="Remove note"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            ) : canWriteNote ? (
              <button
                className={styles.teacherNoteAddBtn}
                onClick={() => setEditingNote(true)}
                disabled={!onSetTeacherNote}
              >
                <Plus size={13} /> Add note
              </button>
            ) : (
              <p className={styles.teacherNotePlaceholder}>No note</p>
            )}
          </div>
        </div>

        {/* Divider */}
        <hr className={styles.sectionDivider} />

        {/* 6. Classroom Observations */}
        <div>
          <label className={styles.observationHeading}>Classroom Observations</label>
          <div className={styles.noteInputWrap}>
            <textarea
              className={styles.noteInput}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add observation note..."
              rows={3}
            />
            <label
              className={`${styles.attentionRow} ${needsAttention ? styles.attentionRowActive : ''}`}
            >
              <input
                type="checkbox"
                checked={needsAttention}
                onChange={(e) => setNeedsAttention(e.target.checked)}
                className={styles.attentionCheckbox}
              />
              <AlertTriangle size={14} className={styles.attentionIcon} />
              <span className={styles.attentionLabel}>Needs management attention</span>
            </label>
            <button
              className={styles.saveNoteBtn}
              onClick={handleSaveNote}
              disabled={!noteText.trim() || noteSaving}
            >
              {noteSaving ? 'Saving…' : 'Save Note'}
            </button>
            {noteSuccess && (
              <p className={styles.noteSuccessMsg}>
                <Check size={14} /> Note saved
              </p>
            )}
            {noteError && (
              <p className={styles.noteErrorMsg}>{noteError}</p>
            )}
          </div>
        </div>

        {/* 7. Observation Log */}
        <div>
          <label className={`${styles.label} ${styles.labelSpaced}`}>
            Observation Log
          </label>
          <div className={styles.observationLog}>
            {classroomNotes && classroomNotes.length > 0 ? (
              classroomNotes.map((n) => (
                <div key={n.id} className={styles.noteCard}>
                  <div className={styles.noteCardHeader}>
                    <div className={styles.noteCardLeft}>
                      {n.needs_management_attention && (
                        <span className={styles.attentionDot} />
                      )}
                      <span className={styles.noteAuthorName}>
                        {n.author_name || 'Staff'}
                      </span>
                      <span className={styles.noteSep}>—</span>
                      <span className={styles.noteDate}>
                        {formatRelativeTime(n.created_at)}
                      </span>
                    </div>
                  </div>
                  <p className={styles.noteContent}>{n.note_text}</p>
                </div>
              ))
            ) : (
              <EmptyState icon={BookOpen} title="No observations recorded yet." />
            )}
          </div>
        </div>

        {/* 8. Library Books */}
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

      </div>
    </div>
  );
}
