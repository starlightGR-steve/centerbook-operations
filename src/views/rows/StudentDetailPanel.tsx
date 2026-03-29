'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  X, BookOpen, Heart, AlertTriangle, Check, ArrowRight,
  Lightbulb, CircleHelp, Star, AlertCircle, Zap, Flag, UserCheck, Sparkles,
  ChevronDown, ChevronUp, Pin,
} from 'lucide-react';
import { api } from '@/lib/api';
import EmptyState from '@/components/ui/EmptyState';
import SmsStatusIndicator from '@/components/SmsStatusIndicator';
import type { AppRole } from '@/lib/auth';
import type { Student, Attendance, RowAssignmentFlags } from '@/lib/types';
import { parseSubjects, parseScheduleDays, formatTimeKey } from '@/lib/types';
import { useClassroomNotes, createClassroomNote } from '@/hooks/useClassroomNotes';
import { useOutstandingLoans } from '@/hooks/useLibrary';
import { useFlagConfig, useChecklistConfig } from '@/hooks/useFlagConfig';
import { usePersistentItems } from '@/hooks/usePersistentItems';
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

function FlagIcon({ icon, size = 12 }: { icon: string | undefined; size?: number }) {
  if (!icon) return <Flag size={size} color="#fff" />;
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
  onBulkUpdate?: (updated: RowAssignmentFlags) => void;
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
  onBulkUpdate,
  onSetTeacherNote,
  onClose,
}: StudentDetailPanelProps) {
  const { data: session } = useSession();
  const staffId = Number((session?.user as { id?: string } | undefined)?.id) || 0;
  const role = (session?.user as { role?: AppRole } | undefined)?.role;
  const isAdmin = role === 'admin' || role === 'superuser';
  const [noteText, setNoteText] = useState('');
  const [needsAttention, setNeedsAttention] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteSuccess, setNoteSuccess] = useState(false);
  const [teacherNoteInput, setTeacherNoteInput] = useState(flags?.teacher_note ?? '');
  const [showAddItems, setShowAddItems] = useState(false);

  // Test Result form state
  const [trOpen, setTrOpen] = useState(false);
  const [trSubject, setTrSubject] = useState<'math' | 'reading' | null>(null);
  const [trResult, setTrResult] = useState<'passed' | 'review' | 'borderline' | null>(null);
  const [trNotes, setTrNotes] = useState('');
  const [trManagerReview, setTrManagerReview] = useState(false);
  const [trSubmitting, setTrSubmitting] = useState(false);
  const [trError, setTrError] = useState<string | null>(null);
  const [trSuccess, setTrSuccess] = useState(false);
  const { data: classroomNotes, mutate: mutateNotes } = useClassroomNotes(student.id);
  const { data: allLoans } = useOutstandingLoans();
  const { flags: flagConfig } = useFlagConfig();
  const { items: checklistConfig } = useChecklistConfig();
  const { isStayOn, addItem: addPersistentItem, removeItem: removePersistentItem } = usePersistentItems(
    isAdmin ? student.id : null
  );

  // Mobile: intercept device back button to close this panel instead of navigating away
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(max-width: 768px)').matches) return;
    window.history.pushState({ detailPanel: true }, '');
    const handlePopState = () => onClose();
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.detailPanel) {
        window.history.back();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync teacher note input when student changes
  useEffect(() => {
    setTeacherNoteInput(flags?.teacher_note ?? '');
  }, [student.id, flags?.teacher_note]);

  const studentLoans = allLoans?.filter((l) => l.student_id === student.id);
  const scheduleDays = parseScheduleDays(student.class_schedule_days);
  const subjects = parseSubjects(student.subjects);
  const scheduleDetail = student.schedule_detail;

  const handleOpenAddItems = () => {
    setTeacherNoteInput(flags?.teacher_note ?? '');
    setShowAddItems(true);
  };

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
      {/* 1. Header — name is clickable link for admins; profile arrow + close */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.avatar}>{student.first_name[0]}</div>
          <div>
            {isAdmin ? (
              <Link href={`/students/${student.id}`} className={styles.headerNameLink} onClick={onClose}>
                <h3 className={styles.headerName}>
                  {student.first_name} {student.last_name}
                </h3>
              </Link>
            ) : (
              <h3 className={styles.headerName}>
                {student.first_name} {student.last_name}
              </h3>
            )}
            <p className={styles.headerSub}>
              {rowLabel || 'Row'} · Grade {student.grade_level || '—'} · {student.program_type || 'Paper'}
            </p>
          </div>
        </div>
        <div className={styles.headerActions}>
          {isAdmin && (
            <Link
              href={`/students/${student.id}`}
              className={styles.profileIconLink}
              onClick={onClose}
              title="View Full Profile"
            >
              <ArrowRight size={16} />
            </Link>
          )}
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
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

        {/* 3. Medical / Allergies */}
        {student.medical_notes && student.medical_notes !== 'None' && student.medical_notes.trim() !== '' && (
          <div className={styles.medicalAlert}>
            <Heart size={16} color="var(--red)" />
            <div>
              <p className={styles.medicalTitle}>Medical / Allergies</p>
              <p className={styles.medicalText}>{student.medical_notes}</p>
            </div>
          </div>
        )}

        {/* 4. SMS Status */}
        {attendance && attendance.sms_10min_sent && (
          <SmsStatusIndicator attendance={attendance} variant="detail" />
        )}

        {/* 5. Schedule — text list using schedule_detail per-day times */}
        <div>
          <label className={styles.label}>Schedule</label>
          {scheduleDetail && Object.keys(scheduleDetail).length > 0 ? (
            <div className={styles.scheduleList}>
              {Object.entries(scheduleDetail)
                .sort(([, a], [, b]) => a.sort_key - b.sort_key)
                .map(([day, info]) => (
                  <div key={day} className={styles.scheduleRow}>
                    <span className={styles.scheduleDay}>{day.slice(0, 3)}</span>
                    <span className={styles.scheduleTime}>{info.start}</span>
                    {info.is_zoom && <span className={styles.scheduleZoom}>Zoom</span>}
                  </div>
                ))}
            </div>
          ) : scheduleDays.length > 0 ? (
            <div className={styles.scheduleList}>
              {DAYS.filter((d) => scheduleDays.includes(d)).map((d) => (
                <div key={d} className={styles.scheduleRow}>
                  <span className={styles.scheduleDay}>{d.slice(0, 3)}</span>
                  {student.class_time_sort_key && (
                    <span className={styles.scheduleTime}>{formatTimeKey(student.class_time_sort_key)}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.scheduleEmpty}>No schedule set</p>
          )}
        </div>

        {/* 6. During Class */}
        <div className={styles.duringClassSection}>
          <div className={styles.duringClassHeader}>
            <label className={styles.duringClassHeading}>During Class</label>
            {isAdmin && onBulkUpdate && (
              <button className={styles.assignClassBtn} onClick={handleOpenAddItems}>
                + Assign Class Tasks
              </button>
            )}
          </div>

          {/* 6a. Teacher note amber banner */}
          {flags?.teacher_note && (
            <div className={styles.teacherNoteBanner}>
              <AlertTriangle size={14} className={styles.teacherNoteBannerIcon} />
              <p className={styles.teacherNoteBannerText}>{flags.teacher_note}</p>
              {isAdmin && (
                <button
                  className={styles.teacherNoteBannerDone}
                  onClick={() => onSetTeacherNote?.(null)}
                >
                  Mark done
                </button>
              )}
            </div>
          )}

          {/* 6b. Assigned flags only */}
          {(() => {
            const activeFlags = flagConfig.filter(
              (fc) => !!(flags && (flags as Record<string, unknown>)[fc.key])
            );
            if (activeFlags.length === 0) return null;
            return (
              <div className={styles.flagGrid}>
                {activeFlags.map((fc) => (
                  <button
                    key={fc.key}
                    className={`${styles.flagToggleRow} ${styles.flagToggleRowActive}`}
                    onClick={() => onToggleFlag?.(fc.key)}
                    disabled={!onToggleFlag}
                  >
                    <span className={styles.flagCircleLg} style={{ background: '#1E335E' }}>
                      <FlagIcon icon={fc.icon} size={12} />
                    </span>
                    <span className={styles.flagToggleLabel}>{fc.label}</span>
                    <Check size={14} style={{ color: fc.color, flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            );
          })()}

          {/* 6c. Assigned checklist items (standard + custom) */}
          {(() => {
            const assignedChecklist = checklistConfig.filter((ci) => {
              const val = flags?.tasks ? (flags.tasks as Record<string, unknown>)[ci.key] : undefined;
              return val !== undefined && val !== null;
            });
            const configKeys = new Set(checklistConfig.map((c) => c.key));
            const customTaskKeys = Object.keys(flags?.tasks || {}).filter((k) => !configKeys.has(k));
            if (assignedChecklist.length === 0 && customTaskKeys.length === 0) return null;
            return (
              <div className={styles.checklistGrid}>
                {assignedChecklist.map((ci) => {
                  const isDone = flags?.tasks ? (flags.tasks as Record<string, unknown>)[ci.key] === true : false;
                  return (
                    <button
                      key={ci.key}
                      className={`${styles.checklistRow} ${isDone ? styles.checklistRowDone : styles.checklistRowAssigned}`}
                      onClick={() => onToggleTask?.(ci.key)}
                      disabled={!onToggleTask}
                    >
                      <span className={`${styles.checkBox} ${isDone ? styles.checkBoxChecked : styles.checkBoxAssigned}`}>
                        {isDone && <Check size={9} color="var(--white)" />}
                      </span>
                      <span className={`${styles.checklistLabel} ${isDone ? styles.checklistLabelDone : ''}`}>
                        {ci.label}
                      </span>
                    </button>
                  );
                })}
                {customTaskKeys.map((key) => {
                  const val = (flags?.tasks as Record<string, unknown>)?.[key];
                  const isDone = val === true;
                  const label = typeof val === 'string' && val.length > 0
                    ? val
                    : key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                  return (
                    <button
                      key={key}
                      className={`${styles.checklistRow} ${isDone ? styles.checklistRowDone : styles.checklistRowAssigned}`}
                      onClick={() => onToggleTask?.(key)}
                      disabled={!onToggleTask}
                    >
                      <span className={`${styles.checkBox} ${isDone ? styles.checkBoxChecked : styles.checkBoxAssigned}`}>
                        {isDone && <Check size={9} color="var(--white)" />}
                      </span>
                      <span className={`${styles.checklistLabel} ${isDone ? styles.checklistLabelDone : ''}`}>
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {/* 6d. Empty state — when no flags and no checklist assigned */}
          {(() => {
            const hasFlags = flagConfig.some((fc) => !!(flags && (flags as Record<string, unknown>)[fc.key]));
            const configKeys = new Set(checklistConfig.map((c) => c.key));
            const customTaskKeys = Object.keys(flags?.tasks || {}).filter((k) => !configKeys.has(k));
            const hasTasks = customTaskKeys.length > 0 || checklistConfig.some((ci) => {
              const val = flags?.tasks ? (flags.tasks as Record<string, unknown>)[ci.key] : undefined;
              return val !== undefined && val !== null;
            });
            if (!hasFlags && !hasTasks) {
              return <p className={styles.emptyItems}>No items assigned</p>;
            }
            return null;
          })()}

          {/* 6e. Record Test Result */}
          <div className={styles.testResultSection}>
            <button
              className={`${styles.testResultToggle} ${trOpen ? styles.testResultToggleOpen : ''}`}
              onClick={() => setTrOpen(o => !o)}
            >
              <span className={styles.testResultToggleLabel}>Record test result</span>
              {trOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {trOpen && (
              <div className={styles.testResultForm}>
                {/* Subject */}
                <div className={styles.trRow}>
                  <span className={styles.trFieldLabel}>Subject</span>
                  <div className={styles.trToggleGroup}>
                    {subjects.includes('Math') && student.current_level_math && (
                      <button
                        className={`${styles.trToggleBtn} ${trSubject === 'math' ? styles.trToggleMath : ''}`}
                        onClick={() => setTrSubject('math')}
                      >
                        Math {student.current_level_math}
                      </button>
                    )}
                    {subjects.includes('Reading') && student.current_level_reading && (
                      <button
                        className={`${styles.trToggleBtn} ${trSubject === 'reading' ? styles.trToggleReading : ''}`}
                        onClick={() => setTrSubject('reading')}
                      >
                        Reading {student.current_level_reading}
                      </button>
                    )}
                  </div>
                </div>

                {/* Result */}
                <div className={styles.trRow}>
                  <span className={styles.trFieldLabel}>Result</span>
                  <div className={styles.trToggleGroup}>
                    {([
                      { id: 'passed'     as const, label: 'Passed',          cls: styles.trTogglePassed },
                      { id: 'review'     as const, label: 'Review & retest',  cls: styles.trToggleReview },
                      { id: 'borderline' as const, label: 'Borderline',       cls: styles.trToggleBorderline },
                    ]).map(r => (
                      <button
                        key={r.id}
                        className={`${styles.trToggleBtn} ${trResult === r.id ? r.cls : ''}`}
                        onClick={() => setTrResult(r.id)}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <textarea
                  className={styles.trNotes}
                  value={trNotes}
                  onChange={(e) => setTrNotes(e.target.value)}
                  placeholder="Notes on the test..."
                  rows={2}
                />

                {/* Manager review */}
                <label className={styles.trManagerRow}>
                  <input
                    type="checkbox"
                    checked={trManagerReview}
                    onChange={(e) => setTrManagerReview(e.target.checked)}
                    className={styles.trManagerCheckbox}
                  />
                  <span>Amy/Bincy needs to review</span>
                </label>

                {/* Contextual hint */}
                {trResult && (
                  <div className={
                    trResult === 'passed' ? styles.trHintGreen
                    : trResult === 'review' ? styles.trHintRed
                    : styles.trHintAmber
                  }>
                    {trResult === 'passed' && 'Fran will be notified to prepare certificate + $1 and pull homework for next level'}
                    {trResult === 'review' && 'Fran will be notified to pull review worksheets'}
                    {trResult === 'borderline' && 'This will be sent to Amy/Bincy for review before going to Fran'}
                  </div>
                )}

                {trError && <p className={styles.trError}>{trError}</p>}
                {trSuccess && (
                  <p className={styles.trSuccessMsg}>
                    <Check size={14} /> Test result recorded
                  </p>
                )}

                {/* Actions */}
                <div className={styles.trActions}>
                  <button
                    className={styles.trCancelBtn}
                    onClick={() => {
                      setTrOpen(false);
                      setTrSubject(null); setTrResult(null);
                      setTrNotes(''); setTrManagerReview(false);
                      setTrError(null); setTrSuccess(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.trSubmitBtn}
                    disabled={!trSubject || !trResult || trSubmitting}
                    onClick={async () => {
                      if (!trSubject || !trResult || trSubmitting) return;
                      setTrSubmitting(true);
                      setTrError(null);
                      try {
                        await api.notifications.create({
                          type: 'test_result',
                          student_id: student.id,
                          subject: trSubject,
                          level: trSubject === 'math'
                            ? (student.current_level_math ?? '')
                            : (student.current_level_reading ?? ''),
                          result: trResult,
                          notes: trNotes.trim() || undefined,
                          needs_manager_review: trManagerReview,
                        });
                        setTrSuccess(true);
                        setTrSubject(null); setTrResult(null);
                        setTrNotes(''); setTrManagerReview(false);
                        setTimeout(() => { setTrOpen(false); setTrSuccess(false); }, 2000);
                      } catch {
                        setTrError('Failed to submit. Please try again.');
                      } finally {
                        setTrSubmitting(false);
                      }
                    }}
                  >
                    {trSubmitting ? 'Submitting…' : 'Submit →'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Assign Class Tasks modal (moved inside During Class) */}
          {showAddItems && (
            <div className={styles.addItemsOverlay}>
              <div className={styles.addItemsPanel}>
                <div className={styles.addItemsPanelHeader}>
                  <span className={styles.addItemsPanelTitle}>Assign Class Tasks</span>
                  <button className={styles.addItemsClose} onClick={() => setShowAddItems(false)}>
                    <X size={16} />
                  </button>
                </div>

                <label className={styles.addItemsSectionLabel}>Flags</label>
                <div className={styles.addItemsGrid}>
                  {flagConfig.map((fc) => {
                    const isOn = !!(flags && (flags as Record<string, unknown>)[fc.key]);
                    return (
                      <button
                        key={fc.key}
                        className={`${styles.addItemToggle} ${isOn ? styles.addItemToggleOn : ''}`}
                        onClick={() => {
                          if (!onBulkUpdate) return;
                          const updated = { ...flags } as RowAssignmentFlags;
                          if (isOn) {
                            delete (updated as Record<string, unknown>)[fc.key];
                          } else {
                            (updated as Record<string, unknown>)[fc.key] = true;
                          }
                          onBulkUpdate(updated);
                        }}
                      >
                        <span className={styles.addItemCircle} style={isOn ? { background: fc.color } : undefined}>
                          <FlagIcon icon={fc.icon} size={10} />
                        </span>
                        <span>{fc.label}</span>
                      </button>
                    );
                  })}
                </div>

                <label className={styles.addItemsSectionLabel}>Checklist</label>
                <div className={styles.addItemsGrid}>
                  {checklistConfig.map((ci) => {
                    const val = flags?.tasks ? (flags.tasks as Record<string, unknown>)[ci.key] : undefined;
                    const isOn = val !== undefined && val !== null;
                    const stayOn = isStayOn(ci.key);
                    return (
                      <div key={ci.key} className={styles.addItemRow}>
                        <button
                          className={`${styles.addItemToggle} ${isOn ? styles.addItemToggleOn : ''}`}
                          onClick={() => {
                            if (!onBulkUpdate) return;
                            const tasks = { ...(flags?.tasks || {}) } as Record<string, boolean | string | null | undefined>;
                            if (isOn) {
                              delete tasks[ci.key];
                            } else {
                              tasks[ci.key] = false;
                            }
                            onBulkUpdate({ ...flags, tasks } as RowAssignmentFlags);
                          }}
                        >
                          <span className={`${styles.addItemCheck} ${isOn ? styles.addItemCheckOn : ''}`}>
                            {isOn && <Check size={9} color="var(--white)" />}
                          </span>
                          <span>{ci.label}</span>
                        </button>
                        <button
                          className={`${styles.pinBtn} ${stayOn ? styles.pinBtnActive : ''}`}
                          onClick={() => stayOn
                            ? removePersistentItem(ci.key)
                            : addPersistentItem(ci.key, 'checklist')
                          }
                          title={stayOn ? 'Repeats daily — click to remove' : 'Set to repeat daily'}
                          aria-label={stayOn ? 'Remove from daily repeats' : 'Add to daily repeats'}
                        >
                          <Pin size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Note for teacher — pre-filled with existing note */}
                <label className={styles.addItemsSectionLabel}>Note for Teacher</label>
                <textarea
                  className={styles.teacherNoteModalInput}
                  value={teacherNoteInput}
                  onChange={(e) => setTeacherNoteInput(e.target.value)}
                  rows={3}
                  placeholder="Instruction note for this student..."
                />

                <button
                  className={styles.addItemsDone}
                  onClick={() => {
                    onSetTeacherNote?.(teacherNoteInput.trim() || null);
                    setShowAddItems(false);
                  }}
                >
                  Save &amp; Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 7. Classroom Observations */}
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
