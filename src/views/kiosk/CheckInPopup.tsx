'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import {
  X, Heart, Minus, Plus, Check, Send, AlertTriangle, ExternalLink, Clock,
} from 'lucide-react';
import { api } from '@/lib/api';
import { parseSubjects, parseScheduleDays, formatTimeKey } from '@/lib/types';
import type { Student, StudentContact, StudentNote } from '@/lib/types';
import { createNote } from '@/hooks/useNotes';
import { useFlagConfig, useChecklistConfig } from '@/hooks/useFlagConfig';
import styles from './CheckInPopup.module.css';

export interface CheckInOptions {
  studentId: number;
  sessionMinutes: number;
  pickupContactId: number | null;
  selectedChecklist: string[];
  selectedFlags: string[];
  noteForTeacher: string | null;
}

interface CheckInPopupProps {
  student: Student;
  onClose: () => void;
  onConfirm: (options: CheckInOptions) => void;
}

const PRESET_TIMES = [30, 45, 60, 90];

// Checklist items and flag options are now loaded from center config via hooks

export default function CheckInPopup({ student, onClose, onConfirm }: CheckInPopupProps) {
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

  // State — use schedule_detail duration if available, else default 60
  const defaultMinutes = todayDetail?.duration ?? (subjects.length > 1 ? 60 : 30);
  const [sessionMinutes, setSessionMinutes] = useState(defaultMinutes);
  const [pickupContactId, setPickupContactId] = useState<number | null>(null);
  const [selectedChecklist, setSelectedChecklist] = useState<string[]>([]);
  const [selectedFlags, setSelectedFlags] = useState<string[]>([]);
  const [customTask, setCustomTask] = useState('');
  const [teacherNote, setTeacherNote] = useState('');
  const [noteSending, setNoteSending] = useState(false);
  const [noteSent, setNoteSent] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showEndTime, setShowEndTime] = useState(false);
  const [endTime, setEndTime] = useState('');

  // Default pickup contact to primary
  useEffect(() => {
    if (contacts && !pickupContactId) {
      const primary = contacts.find((c) => c.is_primary_contact);
      if (primary) setPickupContactId(primary.id);
      else if (contacts.length > 0) setPickupContactId(contacts[0].id);
    }
  }, [contacts, pickupContactId]);

  const selectedContact = contacts?.find((c) => c.id === pickupContactId);

  const adjustTime = (delta: number) => {
    setSessionMinutes((prev) => Math.max(15, Math.min(180, prev + delta)));
  };

  const handleEndTimeChange = (value: string) => {
    setEndTime(value);
    if (!value) return;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const [h, m] = value.split(':').map(Number);
    const endMinutes = h * 60 + m;
    const duration = endMinutes - nowMinutes;
    if (duration > 0 && duration <= 180) {
      setSessionMinutes(duration);
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

  const handleSendNote = async () => {
    if (!teacherNote.trim() || noteSending) return;
    setNoteSending(true);
    try {
      await createNote({
        student_id: student.id,
        content: teacherNote.trim(),
        author_type: 'staff',
        author_name: session?.user?.name || 'Staff',
        author_id: staffId,
        note_date: new Date().toISOString().split('T')[0],
        visibility: 'staff',
      });
      setTeacherNote('');
      setNoteSent(true);
      setTimeout(() => setNoteSent(false), 2000);
    } catch {
      // silent fail for note
    } finally {
      setNoteSending(false);
    }
  };

  const handleConfirm = () => {
    setConfirming(true);
    onConfirm({
      studentId: student.id,
      sessionMinutes,
      pickupContactId,
      selectedChecklist,
      selectedFlags,
      noteForTeacher: teacherNote.trim() || null,
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

            {/* Session Time */}
            <div className={styles.col}>
              <span className={styles.colLabel}>Session Time</span>
              <div className={styles.timeDisplay}>{sessionMinutes}m</div>
              <div className={styles.timeControls}>
                <button className={styles.timeBtn} onClick={() => adjustTime(-5)}>-5</button>
                <button className={styles.timeBtn} onClick={() => adjustTime(-1)}>-1</button>
                <span className={styles.timeValue}>{sessionMinutes}</span>
                <button className={styles.timeBtn} onClick={() => adjustTime(1)}>+1</button>
                <button className={styles.timeBtn} onClick={() => adjustTime(5)}>+5</button>
              </div>
              <div className={styles.presets}>
                {PRESET_TIMES.map((t) => (
                  <button
                    key={t}
                    className={`${styles.presetBtn} ${sessionMinutes === t ? styles.presetActive : ''}`}
                    onClick={() => setSessionMinutes(t)}
                  >
                    {t}m
                  </button>
                ))}
              </div>
              <button
                className={`${styles.endTimeToggle} ${showEndTime ? styles.endTimeToggleActive : ''}`}
                onClick={() => setShowEndTime((v) => !v)}
              >
                <Clock size={12} /> Set end time
              </button>
              {showEndTime && (
                <div className={styles.endTimeRow}>
                  <input
                    type="time"
                    className={styles.endTimeInput}
                    value={endTime}
                    onChange={(e) => handleEndTimeChange(e.target.value)}
                  />
                  {endTime && <span className={styles.endTimeDuration}>{sessionMinutes}m from now</span>}
                </div>
              )}
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

          {/* Note for Teacher — first */}
          <div className={styles.sectionBlock}>
            <span className={styles.colLabel}>Note for Teacher</span>
            <div className={styles.noteInputRow}>
              <input
                className={styles.noteInput}
                placeholder="Add a note..."
                value={teacherNote}
                onChange={(e) => setTeacherNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendNote()}
              />
              <button
                className={styles.sendBtn}
                onClick={handleSendNote}
                disabled={noteSending || !teacherNote.trim()}
              >
                {noteSent ? <Check size={14} /> : <Send size={14} />}
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
          <button
            className={styles.outlineBtn}
            onClick={() => { handleConfirm(); router.push(`/students/${student.id}`); }}
            disabled={confirming}
          >
            <Check size={14} /> Check In &amp; Open Record
          </button>
          <button className={styles.confirmBtn} onClick={handleConfirm} disabled={confirming}>
            {confirming ? 'Checking in...' : (
              <>
                <Check size={16} /> Confirm Check-In
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
