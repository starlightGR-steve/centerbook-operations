'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import {
  X, Heart, Check, Send, AlertTriangle, ExternalLink,
} from 'lucide-react';
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
}

interface CheckInPopupProps {
  student: Student;
  onClose: () => void;
  onConfirm: (options: CheckInOptions) => void;
  existingPrep?: {
    flags: string[];
    checklist: string[];
    teacherNote: string;
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

  // State — use schedule_detail duration if available, else fall through getSessionDuration priority
  const defaultMinutes = getSessionDuration(subjects, { scheduleDetail: student.schedule_detail });
  const [sessionMinutes, setSessionMinutes] = useState(defaultMinutes);
  const [pickupContactId, setPickupContactId] = useState<number | null>(null);
  const [selectedChecklist, setSelectedChecklist] = useState<string[]>(existingPrep?.checklist ?? []);
  const [selectedFlags, setSelectedFlags] = useState<string[]>(existingPrep?.flags ?? []);
  const [customTask, setCustomTask] = useState('');
  const [notesList, setNotesList] = useState<string[]>([]);
  const [currentNote, setCurrentNote] = useState(existingPrep?.teacherNote ?? '');
  const [confirming, setConfirming] = useState(false);
  const [visitPlanApplied, setVisitPlanApplied] = useState(false);

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
            {/* Pickup Contact */}
            <div className={styles.col}>
              <span className={styles.colLabel}>Pickup Text Goes To</span>
              <select
                className={styles.contactSelect}
                value={pickupContactId ?? ''}
                onChange={(e) => setPickupContactId(Number(e.target.value) || null)}
              >
                <option value="">Select contact...</option>
                {contacts?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {student.first_name}&apos;s {c.relationship_to_students || 'Contact'} ({c.first_name}) {c.is_primary_contact ? '- Primary' : ''}
                  </option>
                ))}
              </select>
              {selectedContact?.phone && (
                <span className={styles.phoneText}>{selectedContact.phone}</span>
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

          {/* ── Class Prep ── */}
          <h3 className={styles.sectionHeading}>Class Prep</h3>

          {/* Note for Teacher — multi-entry */}
          <div className={styles.sectionBlock}>
            <span className={styles.colLabel}>Note for Teacher</span>
            {notesList.length > 0 && (
              <div className={styles.noteChipList}>
                {notesList.map((note, i) => (
                  <div key={i} className={styles.noteChip}>
                    <span className={styles.noteChipText}>{note}</span>
                    <button
                      className={styles.noteChipRemove}
                      onClick={() => setNotesList((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      <X size={10} />
                    </button>
                  </div>
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
                className={styles.sendBtn}
                onClick={handleSendNote}
                disabled={!currentNote.trim()}
              >
                <Send size={14} />
              </button>
            </div>
          </div>

          {/* Teacher Checklist */}
          <div className={styles.sectionBlock}>
            <span className={styles.colLabel}>Teacher Checklist</span>
            <div className={styles.pillGrid}>
              {checklistConfigItems.map((ci) => (
                <button
                  key={ci.key}
                  className={`${styles.pill} ${selectedChecklist.includes(ci.key) ? styles.pillSelected : ''}`}
                  onClick={() => toggleChecklist(ci.key)}
                >
                  {selectedChecklist.includes(ci.key) && <Check size={12} />}
                  {ci.label}
                </button>
              ))}
              {selectedChecklist.filter((k) => k.startsWith('__custom__:')).map((k) => (
                <button
                  key={k}
                  className={`${styles.pill} ${styles.pillSelected}`}
                  onClick={() => toggleChecklist(k)}
                >
                  <Check size={12} /> {k.slice(11)}
                </button>
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

          {/* Student Flags */}
          <div className={styles.sectionBlock}>
            <span className={styles.colLabel}>Student Flags</span>
            <div className={styles.pillGrid}>
              {flagConfigItems.map((fi) => (
                <button
                  key={fi.key}
                  className={`${styles.pill} ${selectedFlags.includes(fi.key) ? styles.pillSelected : ''}`}
                  onClick={() => toggleFlag(fi.key)}
                >
                  {selectedFlags.includes(fi.key) && <Check size={12} />}
                  {fi.label}
                </button>
              ))}
            </div>
          </div>

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
    </>
  );
}
