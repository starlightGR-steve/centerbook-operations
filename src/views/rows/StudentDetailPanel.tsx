'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  X, BookOpen, Heart, AlertTriangle, Check, ArrowRight, Clock,
} from 'lucide-react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import EmptyState from '@/components/ui/EmptyState';
import SmsStatusIndicator from '@/components/SmsStatusIndicator';
import TimePopover from '@/components/classroom/TimePopover';
import CardButton from '@/components/classroom/CardButton';
import PositionedPortal from '@/components/classroom/PositionedPortal';
import TestingSetupSection, { type TestingState } from '@/components/classroom/TestingSetupSection';
import RecordTestForm, { type RecordTestPayload } from '@/components/classroom/RecordTestForm';
import PermissionsPickupCard from '@/components/classroom/PermissionsPickupCard';
import TeacherNoteCard from '@/components/classroom/TeacherNoteCard';
import PlanNextVisitModal, { type VisitPlanDraft } from '@/components/classroom/PlanNextVisitModal';
import ChecklistItem from '@/components/classroom/ChecklistItem';
import FlagChip, { flagKeyToType } from '@/components/classroom/FlagChip';
import type { Contact, SmsConsentStatus } from '@/lib/types';
import SMSConsentBadge from '@/components/ui/SMSConsentBadge';
import type { AppRole } from '@/lib/auth';
import type { Student, Attendance, RowAssignmentFlags } from '@/lib/types';
import { getTeacherNotes, formatTime } from '@/lib/types';
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

/**
 * 86ah3f3xp Finding 5 (second pair, fix-up): map a flagConfig key to the
 * FlagChip type the Row View card uses. Same switch RowViewCard.tsx and
 * PlanNextVisitModal.tsx ship — keys outside this set return null and the
 * Detail Panel skips them, matching Row View's behavior. */
// flagKeyToType moved to FlagChip.tsx as a named export so the kiosk surfaces
// (CheckInPopup) and the classroom surfaces (RowViewCard, StudentDetailPanel)
// share one mapping table.

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
  const [showAddItems, setShowAddItems] = useState(false);

  // 86ah3f3xp Finding 3D: session info shrinks to compact notes + a single
  // Time button. Edit pencil + AttendanceEditModal trigger removed per audit.
  const [timePopoverOpen, setTimePopoverOpen] = useState(false);
  const timeButtonRef = useRef<HTMLButtonElement>(null);

  // 86agzuwdf §3C: Record Test now uses the shared RecordTestForm component;
  // the old inline trOpen/trSubject/etc. state was deleted along with the form.
  const { data: classroomNotes, mutate: mutateNotes } = useClassroomNotes(student.id);
  const { data: allLoans } = useOutstandingLoans();
  const { flags: flagConfig } = useFlagConfig();
  const { items: checklistConfig } = useChecklistConfig();

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

  const studentLoans = allLoans?.filter((l) => l.student_id === student.id);
  const scheduleDays = parseScheduleDays(student.class_schedule_days);
  const subjects = parseSubjects(student.subjects);
  const scheduleDetail = student.schedule_detail;

  // SMS consent badge in the meta row — three-state per the SMS Consent
  // Design System PDF (sections 2 + 3). Reads from the primary communication
  // parent's Contact record. Returns undefined while the SWR key resolves so
  // the badge renders nothing instead of a wrong fallback.
  const { data: primaryContact } = useSWR<Contact | null>(
    student.primary_contact_id ? `contact-${student.primary_contact_id}` : null,
    async () => student.primary_contact_id ? api.contacts.get(student.primary_contact_id) : null,
    { dedupingInterval: 10_000, revalidateOnFocus: false }
  );
  const primaryContactConsent: SmsConsentStatus | undefined =
    primaryContact === undefined
      ? undefined
      : (primaryContact?.sms_consent_status as SmsConsentStatus | undefined) ?? 'no_reply';

  // 86ah3f3xp Finding 3C: schedule appears once below the badges row, with
  // a clock-icon prefix and per-day "Wed 4:00P · Mon 5:30P" entries (day in
  // bold). The standalone Schedule section further down is removed — this is
  // the single source for schedule display.
  const dayShort: Record<string, string> = {
    Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
    Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
  };
  const formatStart = (start: string): string => start.replace(/(AM|PM)$/, (m) => m[0]);
  const scheduleEntries: Array<{ day: string; start: string; isZoom?: boolean }> = (() => {
    if (scheduleDetail) {
      return Object.entries(scheduleDetail)
        .sort(([, a], [, b]) => a.sort_key - b.sort_key)
        .map(([day, info]) => ({
          day: dayShort[day] ?? day.slice(0, 3),
          start: formatStart(info.start),
          isZoom: info.is_zoom,
        }));
    }
    if (scheduleDays.length > 0) {
      return DAYS.filter((d) => scheduleDays.includes(d)).map((d) => ({
        day: dayShort[d] ?? d.slice(0, 3),
        start: student.class_time_sort_key
          ? formatStart(formatTimeKey(student.class_time_sort_key))
          : '',
      }));
    }
    return [];
  })();

  // 86agzuwdf §3C: Testing Setup state mirrors flags.taking_test (single source
  // of truth in the row assignment). Empty object = no subjects active.
  const takingTest = flags?.taking_test;
  const testingState: TestingState =
    takingTest && typeof takingTest === 'object' ? (takingTest as TestingState) : {};
  const testingActive = Object.keys(testingState).length > 0;

  // Tracks Record Test submissions THIS panel session, so we can auto-clear
  // taking_test when every active subject has been submitted (per Q5 decision).
  const [submittedSubjects, setSubmittedSubjects] = useState<Set<'math' | 'reading'>>(new Set());

  // Reset submitted-set on student change.
  useEffect(() => {
    setSubmittedSubjects(new Set());
  }, [student.id]);

  // Auto-clear effect: when every key in taking_test is in submittedSubjects,
  // flip taking_test to false and reset the local set. Spread (flags ?? {}) so
  // freshly-assigned students with no prior flag activity still update cleanly
  // (the upstream flagsMap omits assignments where a.flags is null).
  useEffect(() => {
    if (!testingActive || !onBulkUpdate) return;
    const activeKeys = Object.keys(testingState) as Array<'math' | 'reading'>;
    const allSubmitted = activeKeys.every((k) => submittedSubjects.has(k));
    if (allSubmitted && activeKeys.length > 0) {
      onBulkUpdate({ ...(flags ?? {}), taking_test: false } as RowAssignmentFlags);
      setSubmittedSubjects(new Set());
    }
  }, [submittedSubjects, testingActive, testingState, flags, onBulkUpdate]);

  const handleTestingChange = (next: TestingState) => {
    if (!onBulkUpdate) return;
    const taking = Object.keys(next).length === 0 ? false : next;
    onBulkUpdate({ ...(flags ?? {}), taking_test: taking } as RowAssignmentFlags);
  };

  const handleRecordTestSubmit = async (payload: RecordTestPayload) => {
    if (payload.result === 'postponed') {
      // Q2: reuse 'custom' visit-plan type with descriptive label rather than
      // introducing a new 'test' type the backend doesn't validate yet.
      await api.visitPlan.create(student.id, [{
        item_key: `test_postponed_${payload.subject}_${Date.now()}`,
        item_type: 'custom',
        item_label: `Postponed test: ${payload.subject === 'math' ? 'Math' : 'Reading'} ${payload.level}`,
        notes: payload.notes || undefined,
      }]);
    } else {
      await api.notifications.create({
        type: 'test_result',
        student_id: student.id,
        subject: payload.subject,
        level: payload.level,
        result: payload.result,
        notes: payload.notes || undefined,
        needs_manager_review: payload.needs_manager_review,
      });
    }
    setSubmittedSubjects((prev) => {
      const next = new Set(prev);
      next.add(payload.subject);
      return next;
    });
  };

  const handleRecordTestCancel = () => {
    // Cancel is form-level; the form stays mounted because Testing Setup is
    // still active. Clearing the form state is internal to RecordTestForm.
  };

  const handleOpenAddItems = () => {
    setShowAddItems(true);
  };

  // Phase 6c: adapter for shared PlanNextVisitModal. Writes to
  // cb_row_assignments.flags (today's session) via the existing onBulkUpdate
  // prop. Add-only semantics: Save unions selections into the current blob.
  const handleAssignClassTasks = async (draft: VisitPlanDraft) => {
    if (!onBulkUpdate) return;
    const current = (flags ?? {}) as RowAssignmentFlags;
    const updated: RowAssignmentFlags = { ...current };

    draft.flags.forEach((key) => {
      (updated as Record<string, unknown>)[key] = true;
    });

    const hasTesting = draft.testing.math != null || draft.testing.reading != null;
    if (hasTesting) {
      updated.taking_test = draft.testing;
    }

    if (draft.checklist.length > 0) {
      const existingTasks = { ...(current.tasks || {}) };
      draft.checklist.forEach((entry) => {
        existingTasks[entry] = false;
      });
      updated.tasks = existingTasks;
    }

    if (draft.note.trim()) {
      const existingNotes = getTeacherNotes(current);
      updated.teacher_notes = [...existingNotes, { text: draft.note.trim(), done: false }];
      updated.teacher_note = undefined;
    }

    onBulkUpdate(updated);
    setShowAddItems(false);
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
      {/* 86agzuwdf §3A: Header — avatar removed, name is the link to full profile.
          Subject pills moved into the subtitle slot; classroom/grade/SMS/schedule
          live in the meta row below. */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          {isAdmin ? (
            <Link
              href={`/students/${student.id}`}
              className={styles.headerNameLink}
              onClick={onClose}
              aria-label={`Open ${student.first_name} ${student.last_name}'s full profile`}
            >
              <h3 className={styles.headerName}>
                {student.first_name} {student.last_name}
              </h3>
              <ArrowRight
                size={24}
                strokeWidth={2}
                className={styles.headerNameArrow}
                aria-hidden="true"
              />
            </Link>
          ) : (
            <h3 className={styles.headerName}>
              {student.first_name} {student.last_name}
            </h3>
          )}
          <div className={styles.headerSubtitle}>
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
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close detail panel">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className={styles.body}>
        {/* 86agzuwdf §3A: Meta row — at-a-glance classroom + grade + SMS + compact schedule. */}
        <div className={styles.metaRow}>
          {student.classroom_position && (
            <span className={styles.posBadge}>{student.classroom_position}</span>
          )}
          <span className={styles.gradeBadge}>Grade {student.grade_level || '—'}</span>
          {/* Three-state SMS consent badge — large variant per PDF section 3
              (Live Class detail panel). Renders nothing while the contact
              fetch is still resolving so the meta row doesn't flicker. */}
          {primaryContactConsent && (
            <SMSConsentBadge status={primaryContactConsent} size="large" />
          )}
        </div>

        {/* 86ah3f3xp Finding 3C: schedule appears once, in compact form,
            below the meta row. Clock icon + per-day "Wed 4:00P" with day bold. */}
        {scheduleEntries.length > 0 && (
          <div className={styles.scheduleInline}>
            <Clock size={14} aria-hidden="true" className={styles.scheduleInlineIcon} />
            {scheduleEntries.map((entry, i) => (
              <span key={`${entry.day}-${i}`} className={styles.scheduleInlineEntry}>
                <strong className={styles.scheduleInlineDay}>{entry.day}</strong>{' '}
                {entry.start}
                {entry.isZoom && <span className={styles.scheduleZoom}>Zoom</span>}
              </span>
            ))}
          </div>
        )}

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

        {/* 86ah3f3xp Finding 3C: standalone Schedule section removed — schedule
            now appears once in the inline strip under the meta row. */}

        {/* 86ah4vrex item 4: During Class moved directly under Medical so the
            day-of work the teacher actually does is the first thing they see.
            Permissions/Pickup/Time + SMS status drop below Observations
            because they're only needed at check-in/checkout, not during the
            active part of the session. */}
        <div className={styles.duringClassSection}>
          <div className={styles.duringClassHeader}>
            <label className={styles.duringClassHeading}>During Class</label>
            {isAdmin && onBulkUpdate && (
              <button className={styles.assignClassBtn} onClick={handleOpenAddItems}>
                + Add classroom item
              </button>
            )}
          </div>

          {/* 6a. Teacher notes — each note rendered as its own spec-compliant TeacherNoteCard.
              Undone first, then done; all notes visible per Row View FINAL section 4:
              "each note renders as its own card in a vertical stack. Marking one done
              does not affect others." */}
          {(() => {
            const allNotes = getTeacherNotes(flags);
            if (allNotes.length === 0) return null;
            const undone = allNotes.filter((n) => !n.done);
            const done = allNotes.filter((n) => n.done);
            const markNoteDone = (idx: number) => {
              if (!onBulkUpdate || !flags) return;
              const updated = [...allNotes];
              updated[idx] = { ...updated[idx], done: true };
              onBulkUpdate({ ...flags, teacher_notes: updated, teacher_note: undefined } as RowAssignmentFlags);
            };
            return (
              <div className={styles.teacherNoteStack}>
                {undone.map((note) => {
                  const realIdx = allNotes.indexOf(note);
                  return (
                    <TeacherNoteCard
                      key={`tn-undone-${realIdx}`}
                      note={note}
                      onMarkDone={() => markNoteDone(realIdx)}
                    />
                  );
                })}
                {done.map((note) => {
                  const realIdx = allNotes.indexOf(note);
                  return (
                    <TeacherNoteCard
                      key={`tn-done-${realIdx}`}
                      note={note}
                      onMarkDone={() => {}}
                    />
                  );
                })}
              </div>
            );
          })()}

          {/* 86ah3f3xp Findings 3H + 5: assigned flags render via the same
              shared FlagChip component the Row View card uses (variant
              "labeled"). Type-specific colored circles — purple New Concept,
              orange Needs Help, plum Work with Amy, teal Needs Homework —
              come from FlagChip's CSS, so the two surfaces look identical.
              Filter shows any flag whose key is on the blob (regardless of
              truthy / falsy) so a flag toggled off persists as a marked-off
              row with FlagChip's "done" treatment (gray fill + strike-through).
              taking_test is excluded; unknown flag keys (no matching FlagChip
              type) are skipped. */}
          {(() => {
            const flagBlob = flags as Record<string, unknown> | null | undefined;
            const activeFlags = flagConfig
              .filter((fc) => fc.key !== 'taking_test')
              .filter((fc) => flagKeyToType(fc.key) !== null)
              .filter((fc) => (flagBlob ? flagBlob[fc.key] !== undefined : false));
            if (activeFlags.length === 0) return null;
            return (
              <div className={styles.flagGrid}>
                {activeFlags.map((fc) => {
                  const type = flagKeyToType(fc.key)!;
                  const isDone = !flagBlob?.[fc.key];
                  return (
                    <FlagChip
                      key={fc.key}
                      type={type}
                      label={fc.label}
                      done={isDone}
                      mode="completion"
                      variant="labeled"
                      onToggle={() => onToggleFlag?.(fc.key)}
                    />
                  );
                })}
              </div>
            );
          })()}

          {/* 86ah3f3xp Finding 5 (second): checklist items now use the shared
              ChecklistItem component in 'completion' mode — same primitive
              the Row View card and Add classroom item popup render. The prior
              custom .checklistRow + .checkBox markup mismatched both surfaces. */}
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
                    <ChecklistItem
                      key={ci.key}
                      itemKey={ci.key}
                      label={ci.label}
                      done={isDone}
                      onToggle={() => onToggleTask?.(ci.key)}
                    />
                  );
                })}
                {customTaskKeys.map((key) => {
                  const val = (flags?.tasks as Record<string, unknown>)?.[key];
                  const isDone = val === true;
                  // Label resolution order matches the legacy code path:
                  //   1. Legacy shape flags.tasks.custom = "<text>" — value is the label.
                  //   2. Phase 6c shape flags.tasks["custom:<text>"] = false — strip prefix.
                  //   3. Unknown key — pretty-print as fallback.
                  const label = typeof val === 'string' && val.length > 0
                    ? val
                    : key.startsWith('custom:')
                      ? key.slice('custom:'.length)
                      : key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                  return (
                    <ChecklistItem
                      key={key}
                      itemKey={key}
                      label={label}
                      done={isDone}
                      onToggle={() => onToggleTask?.(key)}
                    />
                  );
                })}
              </div>
            );
          })()}

          {/* 86agzuwdf §3C: Testing Setup — multi-subject toggles + level pickers.
              Persists to flags.taking_test (object form). Auto-clears when every
              active subject has a Record Test submitted (effect above). */}
          {onBulkUpdate && (
            <div className={styles.testingSetupWrap}>
              <TestingSetupSection
                student={student}
                currentFlags={flags}
                onChange={handleTestingChange}
              />
            </div>
          )}

          {/* 86agzuwdf §3C: Record Test — appears only when Testing Setup has
              ≥1 subject ON. Postponed routes to visit plan; others post a
              test_result notification. Form auto-tracks submitted subjects via
              the auto-clear effect above. */}
          {testingActive && (
            <div className={styles.recordTestWrap}>
              <RecordTestForm
                student={student}
                activeSubjects={testingState}
                onSubmit={handleRecordTestSubmit}
                onCancel={handleRecordTestCancel}
              />
            </div>
          )}

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

        </div>

        {/* Phase 6c: shared PlanNextVisitModal. Writes to today's cb_row_assignments.flags.
            86ah3f3xp Finding 4: pass currentFlags so the modal opens with the
            student's existing flags / tests / checklist already selected. */}
        <PlanNextVisitModal
          student={student}
          isOpen={showAddItems}
          onClose={() => setShowAddItems(false)}
          onSave={handleAssignClassTasks}
          title="Add classroom item"
          testingTense="present"
          currentFlags={flags ?? null}
        />

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

        {/* 86ah4vrex item 4: Permissions and Pickup grouped with the session
            Time row in one panel section, dropped below Observations because
            Amy/teaching only need these at check-in or checkout. Per Visual
            15, the Time row sits at the BOTTOM of this grouping (below the
            Bathroom/Checkout/Pickup block). The wrapper collapses the
            inter-element gap so the three pieces read as one section while
            still keeping each component's internal content untouched. */}
        {attendance && (
          <div className={styles.permissionsTimeGroup}>
            <PermissionsPickupCard
              studentId={student.id}
              studentFirstName={student.first_name}
              attendanceId={attendance.id}
              staffId={staffId}
              primaryParent={primaryContact ?? null}
              bathroomPreference={student.bathroom_preference ?? null}
              checkoutPreference={student.checkout_preference ?? null}
              exitEntrance={student.exit_entrance ?? null}
            />
            {attendance.sms_10min_sent && (
              <SmsStatusIndicator attendance={attendance} variant="detail" />
            )}
            <div className={styles.sessionLine}>
              <div className={styles.sessionLineText}>
                <span>Checked in {formatTime(attendance.check_in)}</span>
                <span aria-hidden="true"> · </span>
                <span>Session {Number(attendance.session_duration_minutes ?? 0)}m</span>
              </div>
              <span ref={timeButtonRef}>
                <CardButton
                  variant="time"
                  label="Time"
                  onPress={() => setTimePopoverOpen(true)}
                />
              </span>
            </div>
          </div>
        )}

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

      {/* 86ah3f3xp Finding 3D: Edit Attendance modal removed from the detail
          panel — the audit-spec'd compact session line replaces it. Editing
          check-in / check-out times now happens on the Attendance kiosk
          page only. */}

      {/* 86agzuwdf §3A: Time popover — anchored to the Time button via the shared
          PositionedPortal helper. Backdrop dismisses; TimePopover's own internal
          mousedown listener also closes via onClose. */}
      {timePopoverOpen && attendance && timeButtonRef.current && createPortal(
        <div
          className={styles.timePopoverBackdrop}
          onClick={() => setTimePopoverOpen(false)}
        />,
        document.body
      )}
      {timePopoverOpen && attendance && timeButtonRef.current && (
        <PositionedPortal
          anchorEl={timeButtonRef.current}
          gap={6}
          className={styles.timePopoverWrapper}
          onClick={(e) => e.stopPropagation()}
        >
          <TimePopover
            attendanceId={attendance.id}
            studentId={student.id}
            initialDurationMinutes={Number(attendance.session_duration_minutes ?? 60)}
            initialCheckIn={attendance.check_in}
            isOpen
            onClose={() => setTimePopoverOpen(false)}
          />
        </PositionedPortal>
      )}
    </div>
  );
}
