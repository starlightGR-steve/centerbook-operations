'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { mutate as globalMutate } from 'swr';
import {
  X, Heart, Check, AlertTriangle, ExternalLink, ChevronDown, Plus, X as XIcon, Pause, Pencil,
} from 'lucide-react';
import SMSConsentBadge from '@/components/ui/SMSConsentBadge';
import AmberInlineNote from '@/components/ui/AmberInlineNote';
import BathroomCaptureModal from '@/components/students/BathroomCaptureModal';
import CheckoutCaptureModal from '@/components/students/CheckoutCaptureModal';
import FlagChip, { flagKeyToType } from '@/components/classroom/FlagChip';
import ChecklistItem from '@/components/classroom/ChecklistItem';
import TeacherNoteCard from '@/components/classroom/TeacherNoteCard';
import TestingSetupSection, { type TestingState } from '@/components/classroom/TestingSetupSection';
import type { SmsConsentStatus, BathroomPreference, CheckoutPreference, ExitEntrance, RowAssignmentFlags } from '@/lib/types';
import { api } from '@/lib/api';
import { parseSubjects, parseScheduleDays, formatTimeKey, getSessionDuration } from '@/lib/types';
import type { Student, StudentContact, StudentNote } from '@/lib/types';
import { useFlagConfig, useChecklistConfig } from '@/hooks/useFlagConfig';
import { useVisitPlan } from '@/hooks/useVisitPlan';
import TimePopover from '@/components/classroom/TimePopover';
import styles from './CheckInPopup.module.css';

export interface CheckInOptions {
  studentId: number;
  sessionMinutes: number;
  pickupContactId: number | null;
  selectedChecklist: string[];
  selectedFlags: string[];
  noteForTeacher: string | null;
  teacherNotes?: Array<{ text: string; done: false }>;
  /** Object form { math?: <level>, reading?: <level> } from TestingSetupSection.
   *  Empty / absent = no testing planned. */
  takingTest?: TestingState;
}

interface CheckInPopupProps {
  student: Student;
  onClose: () => void;
  onConfirm: (options: CheckInOptions) => void;
  existingPrep?: {
    flags: string[];
    checklist: string[];
    teacherNote: string;
    /** Bug 1 fix (86agkv2wu): hydrated from cb_attendance.session_duration_minutes
     *  in edit mode so the popup doesn't fall back to the schedule default and
     *  silently overwrite a staff-overridden duration on Update Class Prep.
     *  Stringly-typed because WordPress returns numeric columns as strings. */
    session_duration_minutes?: number | string | null;
    /** Hydrated from cb_attendance.pending_class_prep.taking_test on Update
     *  Class Prep so TestingSetupSection opens with the existing test plan. */
    takingTest?: TestingState;
  };
}

// Checklist items and flag options are now loaded from center config via hooks

export default function CheckInPopup({ student, onClose, onConfirm, existingPrep }: CheckInPopupProps) {
  const isEditMode = !!existingPrep;
  const router = useRouter();
  const { data: session } = useSession();
  const { flags: flagConfigItems } = useFlagConfig();
  const { items: checklistConfigItems } = useChecklistConfig();
  const staffId = Number((session?.user as { id?: string } | undefined)?.id) || 0;
  const subjects = parseSubjects(student.subjects);
  const scheduleDays = parseScheduleDays(student.class_schedule_days);

  // Contacts
  const { data: contacts } = useSWR<StudentContact[]>(
    `checkin-contacts-${student.id}`,
    () => api.students.contacts(student.id),
    { revalidateOnFocus: false }
  );

  // Recent notes
  const { data: recentNotes } = useSWR<StudentNote[]>(
    `checkin-notes-${student.id}`,
    async () => {
      const notes = await api.notes.forStudent(student.id);
      return notes
        .filter((n) => n.visibility === 'staff' || n.visibility === 'internal')
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 3);
    },
    { revalidateOnFocus: false }
  );

  // Detect if scheduled today
  const todayDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayDetail = student.schedule_detail?.[todayDay];
  const isScheduledToday = scheduleDays.includes(todayDay) || !!todayDetail;

  // Visit plan — pre-populate Class Prep from planned items
  const { activeItems: visitPlanItems } = useVisitPlan(isEditMode ? null : student.id);

  // State — in edit mode, prefer the existing attendance value (hydrated by the
  // caller) over the schedule default; otherwise fall through getSessionDuration.
  const defaultMinutes = existingPrep?.session_duration_minutes != null
    ? Number(existingPrep.session_duration_minutes)
    : getSessionDuration(subjects, { scheduleDetail: student.schedule_detail });
  const [sessionMinutes, setSessionMinutes] = useState(defaultMinutes);
  const [pickupContactId, setPickupContactId] = useState<number | null>(null);
  const [selectedChecklist, setSelectedChecklist] = useState<string[]>(existingPrep?.checklist ?? []);
  const [selectedFlags, setSelectedFlags] = useState<string[]>(existingPrep?.flags ?? []);
  const [customTask, setCustomTask] = useState('');
  const [notesList, setNotesList] = useState<string[]>([]);
  const [currentNote, setCurrentNote] = useState(existingPrep?.teacherNote ?? '');
  const [confirming, setConfirming] = useState(false);
  const [visitPlanApplied, setVisitPlanApplied] = useState(false);
  // Draft taking_test for TestingSetupSection. Object form per RowAssignmentFlags.
  const [testingDraft, setTestingDraft] = useState<TestingState>(existingPrep?.takingTest ?? {});

  // Capture modals + an optimistic overlay over student.bathroom_preference /
  // checkout_preference / exit_entrance so the row updates instantly after Save
  // without waiting for the parent to revalidate the student record.
  const [bathroomModalOpen, setBathroomModalOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [bathroomOverride, setBathroomOverride] = useState<BathroomPreference | null | undefined>(undefined);
  const [checkoutOverride, setCheckoutOverride] = useState<CheckoutPreference | null | undefined>(undefined);
  const [entranceOverride, setEntranceOverride] = useState<ExitEntrance | null | undefined>(undefined);
  const bathroomValue: BathroomPreference | null = bathroomOverride !== undefined
    ? bathroomOverride
    : (student.bathroom_preference ?? null);
  const checkoutValue: CheckoutPreference | null = checkoutOverride !== undefined
    ? checkoutOverride
    : (student.checkout_preference ?? null);
  const entranceValue: ExitEntrance | null = entranceOverride !== undefined
    ? entranceOverride
    : (student.exit_entrance ?? null);

  // Frozen baseline so the TimePopover's End time doesn't drift while the popup is open.
  const checkInBaselineRef = useRef<string>(new Date().toISOString());

  // Apply visit plan items once when they load (only for new check-ins, not edits)
  // Note: teacher_note is NOT pre-filled into the input — it auto-applies in flags on confirm
  useEffect(() => {
    if (visitPlanApplied || !visitPlanItems || visitPlanItems.length === 0) return;
    setVisitPlanApplied(true);

    const planFlags = visitPlanItems.filter((i) => i.item_type === 'flag').map((i) => i.item_key);
    const planChecklist = visitPlanItems.filter((i) => i.item_type === 'checklist').map((i) => i.item_key);
    const planCustoms = visitPlanItems.filter((i) => i.item_type === 'custom').map((i) => `__custom__:${i.item_label || i.item_key}`);

    if (planFlags.length) setSelectedFlags((prev) => [...new Set([...prev, ...planFlags])]);
    if (planChecklist.length || planCustoms.length) {
      setSelectedChecklist((prev) => [...new Set([...prev, ...planChecklist, ...planCustoms])]);
    }
  }, [visitPlanItems, visitPlanApplied]);

  // Default pickup contact to primary
  useEffect(() => {
    if (contacts && !pickupContactId) {
      const primary = contacts.find((c) => c.is_primary_contact);
      if (primary) setPickupContactId(primary.id);
      else if (contacts.length > 0) setPickupContactId(contacts[0].id);
    }
  }, [contacts, pickupContactId]);

  const selectedContact = contacts?.find((c) => c.id === pickupContactId);

  // 86ah3duvq Phase 1 (PDF section 6): per-parent SMS consent badges in the
  // dropdown require a custom popover — native <option> can't render JSX.
  const [pickupOpen, setPickupOpen] = useState(false);
  const pickupRef = useRef<HTMLDivElement>(null);
  // 86ah3duvq Phase 2: id of the parent whose No-reply row has the inline
  // consent block expanded. Null when no row is expanded. Reset on dropdown
  // close so the next open starts collapsed.
  const [captureExpandedFor, setCaptureExpandedFor] = useState<number | null>(null);
  // Saving lock per row so a tap on Yes/No/Skip can't double-fire while
  // the PATCH is in flight.
  const [capturePending, setCapturePending] = useState(false);
  useEffect(() => {
    if (!pickupOpen) {
      setCaptureExpandedFor(null);
      return;
    }
    const onDown = (e: MouseEvent) => {
      if (pickupRef.current && !pickupRef.current.contains(e.target as Node)) {
        setPickupOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [pickupOpen]);

  // 86ah3duvq Phase 2: Yes/No/Skip handlers for the inline capture block.
  // Yes / No PATCH cb_contacts.sms_consent_status with source 'check_in_popup';
  // skip just collapses the block. After PATCH, revalidate the per-student
  // contacts SWR key so the dropdown's badge updates instantly.
  const handleCapture = async (contactId: number, status: SmsConsentStatus | 'skip') => {
    if (status === 'skip') {
      setCaptureExpandedFor(null);
      return;
    }
    if (capturePending) return;
    setCapturePending(true);
    try {
      await api.contacts.updateSmsConsent(contactId, {
        status,
        source: 'check_in_popup',
        notes: 'Captured via check-in popup',
        recorded_by_staff_id: staffId || null,
      });
      // Refresh: the popup's contacts list comes from this SWR key, plus
      // shared keys downstream surfaces read.
      await Promise.all([
        globalMutate(`checkin-contacts-${student.id}`),
        globalMutate(`contact-${contactId}`),
        globalMutate('contacts'),
      ]);
      setCaptureExpandedFor(null);
    } catch (err) {
      console.error('CheckInPopup: capture PATCH failed', err);
    } finally {
      setCapturePending(false);
    }
  };

  const toggleChecklist = (item: string) => {
    setSelectedChecklist((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const addCustomTask = () => {
    if (!customTask.trim()) return;
    setSelectedChecklist((prev) => [...prev, `__custom__:${customTask.trim()}`]);
    setCustomTask('');
  };

  const toggleFlag = (flag: string) => {
    setSelectedFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]
    );
  };

  const handleSendNote = () => {
    if (!currentNote.trim()) return;
    setNotesList((prev) => [...prev, currentNote.trim()]);
    setCurrentNote('');
  };

  const handleConfirm = () => {
    setConfirming(true);
    // Build teacher_notes array: visit plan note + submitted notes + unsent input
    const teacherNotes: Array<{ text: string; done: false }> = [];
    const visitPlanNote = visitPlanItems?.find((i) => i.item_type === 'teacher_note')?.notes;
    if (visitPlanNote) teacherNotes.push({ text: visitPlanNote, done: false });
    notesList.forEach((n) => teacherNotes.push({ text: n, done: false }));
    if (currentNote.trim()) teacherNotes.push({ text: currentNote.trim(), done: false });
    onConfirm({
      studentId: student.id,
      sessionMinutes,
      pickupContactId,
      selectedChecklist,
      selectedFlags,
      noteForTeacher: null,
      teacherNotes: teacherNotes.length > 0 ? teacherNotes : undefined,
      takingTest: Object.keys(testingDraft).length > 0 ? testingDraft : undefined,
    });
  };

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        {/* HEADER */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 className={styles.studentName}>
              {student.first_name} {student.last_name}
            </h2>
            <div className={styles.headerBadges}>
              {subjects.includes('Math') && (
                <span className={styles.badgeMath}>
                  Math {student.current_level_math || ''}
                </span>
              )}
              {subjects.includes('Reading') && (
                <span className={styles.badgeReading}>
                  Reading {student.current_level_reading || ''}
                </span>
              )}
              {student.classroom_position && (
                <span className={styles.badgeNeutral}>{student.classroom_position}</span>
              )}
              {student.grade_level && (
                <span className={styles.gradeText}>Grade {student.grade_level}</span>
              )}
            </div>
            {!isScheduledToday && (
              <span className={styles.unscheduledBadge}>
                Not scheduled today — walk-in / makeup
              </span>
            )}
          </div>
          <div className={styles.headerRight}>
            {student.medical_notes && (
              <div className={styles.medicalAlert}>
                <Heart size={14} />
                <span>{student.medical_notes}</span>
              </div>
            )}
            <button className={styles.closeBtn} onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className={styles.body}>
          {/* ── Pickup & Session ── */}
          <h3 className={styles.sectionHeading}>Pickup &amp; Session</h3>
          <div className={styles.row3}>
            {/* Pickup Contact — custom dropdown so each option can carry its
                SMS consent badge (PDF section 6, default view). Phase 1 is
                badge display only; Phase 2 will add the "+" capture button. */}
            <div className={styles.col}>
              <span className={styles.colLabel}>Pickup Text Goes To</span>
              <div ref={pickupRef} className={styles.pickupDropdown}>
                <button
                  type="button"
                  className={styles.pickupTrigger}
                  onClick={() => setPickupOpen((v) => !v)}
                  aria-haspopup="listbox"
                  aria-expanded={pickupOpen}
                >
                  <span className={styles.pickupTriggerLabel}>
                    {selectedContact ? (
                      <>
                        {student.first_name}&apos;s {selectedContact.relationship_to_students || 'Contact'} ({selectedContact.first_name})
                        {selectedContact.is_primary_contact ? ' - Primary' : ''}
                      </>
                    ) : 'Select contact...'}
                  </span>
                  {selectedContact && (
                    <SMSConsentBadge
                      status={(selectedContact as { sms_consent_status?: SmsConsentStatus }).sms_consent_status ?? 'no_reply'}
                      size="medium"
                    />
                  )}
                  <ChevronDown size={14} className={pickupOpen ? styles.pickupCaretOpen : ''} aria-hidden="true" />
                </button>
                {pickupOpen && (
                  <ul className={styles.pickupOptions} role="listbox">
                    {(contacts ?? []).length === 0 && (
                      <li className={styles.pickupEmpty}>No contacts on file.</li>
                    )}
                    {contacts?.map((c) => {
                      const status = (c as { sms_consent_status?: SmsConsentStatus }).sms_consent_status ?? 'no_reply';
                      const isExpanded = captureExpandedFor === c.id;
                      const showPlus = status === 'no_reply';
                      return (
                        <li
                          key={c.id}
                          role="option"
                          aria-selected={c.id === pickupContactId}
                          className={`${styles.pickupOption} ${c.id === pickupContactId ? styles.pickupOptionSelected : ''} ${isExpanded ? styles.pickupOptionExpanded : ''}`}
                        >
                          <div
                            className={styles.pickupOptionRow}
                            onClick={() => {
                              if (isExpanded) return;
                              setPickupContactId(c.id);
                              setPickupOpen(false);
                            }}
                          >
                            <span className={styles.pickupOptionText}>
                              <span className={styles.pickupOptionName}>{c.first_name} {c.last_name}</span>
                              <span className={styles.pickupOptionSub}>
                                {c.relationship_to_students || 'Contact'}
                                {c.is_primary_contact ? ' · Primary' : ''}
                                {c.phone ? ` · ${c.phone}` : ''}
                              </span>
                            </span>
                            <SMSConsentBadge status={status} size="medium" />
                            {/* PDF section 6: '+' button only on no_reply rows.
                                SMS on rows show only the badge; opted_out rows show
                                only the badge — no re-ask per the locked design. */}
                            {showPlus && (
                              <button
                                type="button"
                                className={`${styles.captureToggle} ${isExpanded ? styles.captureToggleOpen : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCaptureExpandedFor(isExpanded ? null : c.id);
                                }}
                                aria-label={isExpanded ? 'Cancel consent capture' : `Capture SMS consent for ${c.first_name}`}
                                aria-expanded={isExpanded}
                              >
                                {isExpanded ? <XIcon size={16} /> : <Plus size={16} />}
                              </button>
                            )}
                          </div>

                          {isExpanded && (
                            <div className={styles.captureBlock} onClick={(e) => e.stopPropagation()}>
                              <p className={styles.captureHeading}>
                                Ask {c.first_name} about SMS consent
                              </p>
                              <p className={styles.captureScript}>
                                &ldquo;Would you like to receive text notifications about {student.first_name}?&rdquo;
                              </p>
                              <div className={styles.captureActions}>
                                <button
                                  type="button"
                                  className={`${styles.captureBtn} ${styles.captureBtnYes}`}
                                  onClick={() => handleCapture(c.id, 'sms_on')}
                                  disabled={capturePending}
                                >
                                  <Check size={14} aria-hidden="true" />
                                  Yes, opt in
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.captureBtn} ${styles.captureBtnNo}`}
                                  onClick={() => handleCapture(c.id, 'opted_out')}
                                  disabled={capturePending}
                                >
                                  <XIcon size={14} aria-hidden="true" />
                                  No, opt out
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.captureBtn} ${styles.captureBtnSkip}`}
                                  onClick={() => handleCapture(c.id, 'skip')}
                                  disabled={capturePending}
                                >
                                  <Pause size={14} aria-hidden="true" />
                                  Skip for now
                                </button>
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              {selectedContact?.phone && (
                <span className={styles.phoneText}>{selectedContact.phone}</span>
              )}
              {/* PDF section 6: heads-up banner when an Opted out parent is the
                  selected pickup. Not a blocker — staff continues check-in. */}
              {selectedContact && (selectedContact as { sms_consent_status?: SmsConsentStatus }).sms_consent_status === 'opted_out' && (
                <div className={styles.optedOutBanner} role="note">
                  <AlertTriangle size={14} aria-hidden="true" />
                  <span>
                    <strong>{selectedContact.first_name} has opted out of SMS.</strong>{' '}
                    Automatic 5-minute pickup text will not send. You will see a
                    {selectedContact.phone ? ` "Call ${selectedContact.phone}"` : ' "Call"'} prompt on
                    {' '}{student.first_name}&apos;s attendance card when it is time.
                  </span>
                </div>
              )}
            </div>

            {/* Session Time — TimePopover in draft mode (no PUT until check-in confirms) */}
            <div className={styles.col}>
              <span className={styles.colLabel}>Session Time</span>
              <TimePopover
                studentId={student.id}
                initialDurationMinutes={sessionMinutes}
                initialCheckIn={checkInBaselineRef.current}
                isOpen
                onClose={() => { /* no-op: parent owns visibility */ }}
                onDraftChange={({ durationMinutes }) => setSessionMinutes(durationMinutes)}
              />
            </div>

            {/* Schedule */}
            <div className={styles.col}>
              <span className={styles.colLabel}>Schedule</span>
              <div className={styles.scheduleDays}>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday'].map((d) => (
                  <span
                    key={d}
                    className={`${styles.dayPill} ${scheduleDays.includes(d) ? styles.dayActive : ''}`}
                  >
                    {d.slice(0, 3)}
                  </span>
                ))}
              </div>
              {student.class_time_sort_key && (
                <span className={styles.scheduleTime}>
                  {formatTimeKey(student.class_time_sort_key)}
                </span>
              )}
            </div>
          </div>

          {/* ── Permissions & Pickup (per design reference Visuals 1-2) ──
              Two rows. NULL fields show italic amber "Not on file" + teal +
              button that opens the capture modal. Set fields show plain text
              + pencil button that opens the same modal pre-selected. */}
          <div className={styles.permsBlock}>
            <h4 className={styles.permsHeading}>Permissions &amp; Pickup</h4>

            <div className={styles.permsRow}>
              <span className={styles.permsRowLabel}>BATHROOM</span>
              <span className={styles.permsRowValue}>
                {bathroomValue === 'parent_text' && 'Needs parent text'}
                {bathroomValue === 'independent' && 'Goes on their own'}
                {bathroomValue === null && <AmberInlineNote>Not on file</AmberInlineNote>}
              </span>
              {bathroomValue === null ? (
                <button
                  type="button"
                  className={styles.permsAddBtn}
                  onClick={() => setBathroomModalOpen(true)}
                  aria-label="Capture bathroom preference"
                >
                  <Plus size={16} aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.permsEditBtn}
                  onClick={() => setBathroomModalOpen(true)}
                  aria-label="Edit bathroom preference"
                >
                  <Pencil size={14} aria-hidden="true" />
                </button>
              )}
            </div>

            <div className={styles.permsRow}>
              <span className={styles.permsRowLabel}>CHECKOUT</span>
              <span className={styles.permsRowValue}>
                {checkoutValue && entranceValue ? (
                  <>
                    {checkoutValue === 'waits_for_parent' ? 'Waits for parent' : 'Checks out independently'}
                    {' \u00B7 '}
                    {entranceValue === 'front' ? 'Front' : 'Back'}
                  </>
                ) : (
                  <AmberInlineNote>Not on file</AmberInlineNote>
                )}
              </span>
              {checkoutValue && entranceValue ? (
                <button
                  type="button"
                  className={styles.permsEditBtn}
                  onClick={() => setCheckoutModalOpen(true)}
                  aria-label="Edit checkout preference"
                >
                  <Pencil size={14} aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.permsAddBtn}
                  onClick={() => setCheckoutModalOpen(true)}
                  aria-label="Capture checkout preference"
                >
                  <Plus size={16} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          <hr className={styles.divider} />

          {/* STAFF NOTES */}
          {recentNotes && recentNotes.length > 0 && (
            <div className={styles.staffNotes}>
              <div className={styles.staffNotesHeader}>
                <AlertTriangle size={14} />
                <span>Notes from Staff</span>
              </div>
              {recentNotes.map((n) => (
                <div key={n.id} className={styles.staffNoteItem}>
                  <span className={styles.noteAuthor}>{n.author_name || 'Staff'}</span>
                  <span className={styles.noteContent}>{n.content}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Class Prep ──
              Renders identically to the Live Class Detail Panel: shared
              FlagChip, ChecklistItem, TeacherNoteCard, and TestingSetupSection
              components. The popup runs them in selection / draft mode (toggle
              local state, fire one PATCH on Confirm) instead of the immediate-
              write semantics Live Class uses for the active row's flags.
              Reference: Check-In Popup design reference Visual 2. */}
          <h3 className={styles.sectionHeading}>Class Prep</h3>

          {/* NOTE FOR TEACHER — staged notes render as TeacherNoteCard with
              the action button labelled "Remove" (versus "Mark done" in Live
              Class), matching the visual treatment without the persistence. */}
          <div className={styles.sectionBlock}>
            <span className={styles.colLabel}>Note for Teacher</span>
            {notesList.length > 0 && (
              <div className={styles.teacherNoteStack}>
                {notesList.map((noteText, idx) => (
                  <TeacherNoteCard
                    key={`staged-${idx}`}
                    note={{ text: noteText, done: false }}
                    actionLabel="Remove"
                    onMarkDone={() => setNotesList((prev) => prev.filter((_, i) => i !== idx))}
                  />
                ))}
              </div>
            )}
            <div className={styles.noteInputRow}>
              <input
                className={styles.noteInput}
                placeholder="Add a note..."
                value={currentNote}
                onChange={(e) => setCurrentNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendNote()}
              />
              <button
                className={styles.addTaskBtn}
                onClick={handleSendNote}
                disabled={!currentNote.trim()}
              >
                Add
              </button>
            </div>
          </div>

          {/* TEACHER CHECKLIST — shared ChecklistItem in selection mode for
              configured items, plus any staged custom tasks (the popup uses
              the "__custom__:<text>" sentinel — buildClassPrepFlags translates
              that to flags.tasks.custom on the wire). */}
          <div className={styles.sectionBlock}>
            <span className={styles.colLabel}>Teacher Checklist</span>
            <div className={styles.checklistGrid}>
              {checklistConfigItems.map((ci) => (
                <ChecklistItem
                  key={ci.key}
                  itemKey={ci.key}
                  label={ci.label}
                  selected={selectedChecklist.includes(ci.key)}
                  mode="selection"
                  onToggle={() => toggleChecklist(ci.key)}
                />
              ))}
              {selectedChecklist.filter((k) => k.startsWith('__custom__:')).map((k) => (
                <ChecklistItem
                  key={k}
                  itemKey={k}
                  label={k.slice('__custom__:'.length)}
                  selected
                  mode="selection"
                  onToggle={() => toggleChecklist(k)}
                />
              ))}
            </div>
            <div className={styles.addTaskRow}>
              <input
                className={styles.addTaskInput}
                placeholder="Custom task..."
                value={customTask}
                onChange={(e) => setCustomTask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomTask()}
              />
              <button className={styles.addTaskBtn} onClick={addCustomTask} disabled={!customTask.trim()}>
                Add
              </button>
            </div>
          </div>

          {/* STUDENT FLAGS — shared FlagChip in selection mode, variant
              "labeled". All four flags always render; FlagChip's CSS supplies
              the type-specific colored circle + icon (Lightbulb / HelpCircle /
              User / Home). Unknown config keys (no FlagChipType match) are
              skipped, mirroring Live Class. */}
          <div className={styles.sectionBlock}>
            <span className={styles.colLabel}>Student Flags</span>
            <div className={styles.flagGrid}>
              {flagConfigItems
                .filter((fi) => flagKeyToType(fi.key) !== null)
                .map((fi) => (
                  <FlagChip
                    key={fi.key}
                    type={flagKeyToType(fi.key)!}
                    label={fi.label}
                    selected={selectedFlags.includes(fi.key)}
                    mode="selection"
                    variant="labeled"
                    onToggle={() => toggleFlag(fi.key)}
                  />
                ))}
            </div>
          </div>

          {/* TESTING TODAY — shared TestingSetupSection. Renders only when the
              student has subjects; per-subject toggles + level pickers update
              local testingDraft, which folds into pending_class_prep.taking_test
              on Confirm via classPrep.buildClassPrepFlags. */}
          {parseSubjects(student.subjects).length > 0 && (
            <div className={styles.sectionBlock}>
              <TestingSetupSection
                student={student}
                currentFlags={{ taking_test: testingDraft } as RowAssignmentFlags}
                sectionLabel="Testing Today"
                onChange={(next) => setTestingDraft(next)}
              />
            </div>
          )}

          <hr className={styles.divider} />

          {/* ── Checked Out Items ── */}
          <h3 className={styles.sectionHeading}>Checked Out Items</h3>
          <p className={styles.placeholder}>No checked out items</p>
        </div>

        {/* FOOTER */}
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.outlineBtn}
            onClick={() => { onClose(); router.push(`/students/${student.id}`); }}
          >
            <ExternalLink size={14} /> Student Record
          </button>
          {!isEditMode && (
            <button
              className={styles.outlineBtn}
              onClick={() => { handleConfirm(); router.push(`/students/${student.id}`); }}
              disabled={confirming}
            >
              <Check size={14} /> Check In &amp; Open Record
            </button>
          )}
          <button className={styles.confirmBtn} onClick={handleConfirm} disabled={confirming}>
            {confirming ? (isEditMode ? 'Saving...' : 'Checking in...') : (
              <>
                <Check size={16} /> {isEditMode ? 'Update Class Prep' : 'Confirm Check-In'}
              </>
            )}
          </button>
        </div>
      </div>

      {bathroomModalOpen && (
        <BathroomCaptureModal
          studentId={student.id}
          initialValue={bathroomValue}
          onClose={() => setBathroomModalOpen(false)}
          onSaved={async () => {
            // Optimistic local overlay so the row updates instantly; revalidate
            // shared student caches so other surfaces re-sync on next read.
            // Reading the freshly written value from the modal would require a
            // callback signature change — instead we re-fetch the student.
            await Promise.all([
              globalMutate(`student-${student.id}`),
              globalMutate('students'),
            ]);
            const fresh = await api.students.get(student.id);
            setBathroomOverride(fresh.bathroom_preference ?? null);
          }}
        />
      )}
      {checkoutModalOpen && (
        <CheckoutCaptureModal
          studentId={student.id}
          initialMode={checkoutValue}
          initialEntrance={entranceValue}
          onClose={() => setCheckoutModalOpen(false)}
          onSaved={async () => {
            await Promise.all([
              globalMutate(`student-${student.id}`),
              globalMutate('students'),
            ]);
            const fresh = await api.students.get(student.id);
            setCheckoutOverride(fresh.checkout_preference ?? null);
            setEntranceOverride(fresh.exit_entrance ?? null);
          }}
        />
      )}
    </>
  );
}
