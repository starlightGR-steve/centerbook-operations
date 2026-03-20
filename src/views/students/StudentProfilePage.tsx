'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  Plus,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Send,
  FileText,
  Phone,
  Mail,
  Users,
  RefreshCw,
  Pencil,
  Link2,
  Unlink,
  Crown,
  CreditCard,
} from 'lucide-react';
import { api } from '@/lib/api';
import { isDemoModeActive } from '@/context/MockDataContext';
import { MOCK_CONTACTS } from '@/lib/mock-data';
import SectionHeader from '@/components/ui/SectionHeader';
import Badge from '@/components/ui/Badge';
import StudentJournal from '@/components/StudentJournal';
import SubjectBadges from '@/components/SubjectBadges';
import PosBadge from '@/components/PosBadge';
import NoteCard from '@/components/NoteCard';
import VisibilityLabel from '@/components/VisibilityLabel';
import EmptyState from '@/components/ui/EmptyState';
import { useStudent, useStudentContacts, useAllStudents } from '@/hooks/useStudents';
import useSWR from 'swr';
import LinkPickerModal from '@/components/LinkPickerModal';
import { useStudentTasks, completeTask, createTask } from '@/hooks/useStudentTasks';
import { useNotes, createNote } from '@/hooks/useNotes';
import { useActiveStaff } from '@/hooks/useStaff';
import { parseSubjects, parseScheduleDays, formatTimeKey } from '@/lib/types';
import type { CbTaskType, NoteVisibility, Contact } from '@/lib/types';
import styles from './StudentProfilePage.module.css';

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function deriveBirthMonth(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '—';
  return MONTH_NAMES[d.getMonth() + 1] || '—';
}

const TASK_TYPE_LABELS: Record<CbTaskType, string> = {
  birthday: 'Birthday',
  progress_meeting_prep: 'Mtg Prep',
  progress_meeting_followup: 'Mtg Follow-up',
  goals: 'Goals',
  checkin_call: 'Check-in Call',
  form_followup: 'Form Follow-up',
  no_show_followup: 'No-show',
  general: 'General',
};

const MATH_LEVELS = ['6A', '5A', '4A', '3A', '2A', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
const READING_LEVELS = ['7A', '6A', '5A', '4A', '3A', '2A', 'AI', 'AII', 'BI', 'BII', 'CI', 'CII', 'DI', 'DII', 'EI', 'EII', 'FI', 'FII', 'GI', 'GII', 'HI', 'HII', 'II', 'III', 'J', 'K', 'L'];
const ASHR_STATUSES = ['Not Yet ASHR', 'Bronze', 'Silver', 'Gold', 'Platinum'];
const CLASSROOM_POSITIONS = ['Early Learners', 'Main Classroom', 'Upper Classroom'];
const ENROLLMENT_STATUSES = ['Active', 'On Hold', 'Withdrawn'];
const PROGRAM_TYPES = ['Paper', 'Kumon Connect'];
const SUBJECT_OPTIONS = [
  { label: 'Math', value: 'Math' },
  { label: 'Reading', value: 'Reading' },
  { label: 'Math & Reading', value: 'Math, Reading' },
];
const GRADE_LEVELS = ['PK2', 'PK1', 'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'];
const SCHEDULE_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday'];

const TIME_SLOTS = [
  { label: '1:00 PM', sort_key: 1300 },
  { label: '1:30 PM', sort_key: 1330 },
  { label: '2:00 PM', sort_key: 1400 },
  { label: '2:30 PM', sort_key: 1430 },
  { label: '3:00 PM', sort_key: 1500 },
  { label: '3:30 PM', sort_key: 1530 },
  { label: '4:00 PM', sort_key: 1600 },
  { label: '4:30 PM', sort_key: 1630 },
  { label: '5:00 PM', sort_key: 1700 },
  { label: '5:30 PM', sort_key: 1730 },
  { label: '6:00 PM', sort_key: 1800 },
  { label: '6:30 PM', sort_key: 1830 },
];

const DURATION_OPTIONS = [30, 45, 60, 90, 120];

type ScheduleDetailEntry = { start: string; sort_key: number; duration: number };
type ScheduleDetailMap = Record<string, ScheduleDetailEntry>;

type EditableFields = {
  current_level_math?: string | null;
  current_level_reading?: string | null;
  ashr_math_status?: string | null;
  ashr_reading_status?: string | null;
  classroom_position?: string | null;
  enrollment_status?: string;
  program_type?: string | null;
  subjects?: string | null;
  grade_level?: string | null;
  class_schedule_days?: string | null;
  schedule_detail?: ScheduleDetailMap | null;
  school?: string | null;
  student_id?: string | null;
  kc_username?: string | null;
  kc_password?: string | null;
  medical_notes?: string | null;
  date_of_birth?: string | null;
  enroll_date?: string | null;
};

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'Active': return 'success';
    case 'On Hold': return 'warning';
    case 'Withdrawn': return 'danger';
    default: return 'neutral';
  }
}

interface Props {
  studentId: number;
}

export default function StudentProfilePage({ studentId }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const staffId = Number((session?.user as { id?: string } | undefined)?.id) || 0;
  const { data: student, isLoading, mutate: mutateStudent } = useStudent(studentId);
  const { data: tasks, mutate: mutateTasks } = useStudentTasks(studentId);
  const { data: notes } = useNotes(studentId);
  const { data: contacts, error: contactsError, isLoading: contactsLoading, mutate: mutateContacts } = useStudentContacts(studentId);
  const { data: staffList } = useActiveStaff();

  // Password visibility
  const [showKcPw, setShowKcPw] = useState(false);

  // Tasks
  const [showCompleted, setShowCompleted] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskType, setTaskType] = useState<CbTaskType>('general');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskAssignedTo, setTaskAssignedTo] = useState<number>(1);
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  // Notes / Daily Observation
  const [noteText, setNoteText] = useState('');
  const [noteVis, setNoteVis] = useState<NoteVisibility>('staff');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  // Link contact
  const [showLinkContact, setShowLinkContact] = useState(false);
  const [unlinkConfirm, setUnlinkConfirm] = useState<number | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const { data: allContacts, isLoading: allContactsLoading } = useSWR<Contact[]>(
    showLinkContact ? (isDemoModeActive() ? 'demo-all-contacts' : 'all-contacts-for-picker') : null,
    () => isDemoModeActive() ? MOCK_CONTACTS : api.contacts.list()
  );

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editFields, setEditFields] = useState<EditableFields>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // useMemo MUST be above early returns to satisfy React hooks rules
  const changedFields = useMemo(() => {
    if (!student) return {};
    const changes: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(editFields)) {
      const orig = (student as unknown as Record<string, unknown>)[k];
      const origStr = typeof orig === 'object' ? JSON.stringify(orig) : String(orig ?? '');
      const vStr = typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
      if (vStr !== origStr) changes[k] = v === '' ? null : v;
    }
    return changes;
  }, [editFields, student]);

  const hasChanges = Object.keys(changedFields).length > 0;

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading student...</div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Student not found.</div>
      </div>
    );
  }

  const openTasks = tasks?.filter((t) => t.status === 'open') ?? [];
  const completedTasks = tasks?.filter((t) => t.status === 'complete') ?? [];
  const scheduleDays = parseScheduleDays(student.class_schedule_days);
  const today = new Date().toISOString().split('T')[0];

  const handleAddNote = async () => {
    if (!noteText.trim() || noteSaving) return;
    setNoteSaving(true);
    setNoteError(null);
    try {
      await createNote({
        student_id: studentId,
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

  const handleNoteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddNote();
    }
  };

  const handleCompleteTask = async (taskId: number) => {
    try {
      await completeTask(taskId, studentId);
      mutateTasks();
    } catch {
      setTaskError('Failed to complete task.');
    }
  };

  const handleCreateTask = async () => {
    if (!taskTitle.trim()) return;
    setTaskSaving(true);
    setTaskError(null);
    try {
      await createTask(
        {
          student_id: studentId,
          assigned_to: taskAssignedTo,
          created_by: taskAssignedTo,
          type: taskType,
          title: taskTitle.trim(),
          due_date: taskDueDate || null,
        },
        studentId
      );
      setTaskTitle('');
      setTaskType('general');
      setTaskDueDate('');
      setShowTaskForm(false);
      mutateTasks();
    } catch {
      setTaskError('Failed to create task. Please try again.');
    } finally {
      setTaskSaving(false);
    }
  };

  const startEditing = () => {
    setEditFields({});
    setEditError(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditFields({});
    setEditError(null);
    setIsEditing(false);
  };

  const setField = (key: keyof EditableFields, value: unknown) => {
    setEditFields((prev) => ({ ...prev, [key]: value }));
  };

  const getField = (key: keyof EditableFields): string => {
    if (key in editFields) return (editFields[key] as string) ?? '';
    return ((student as unknown as Record<string, unknown>)[key] as string) ?? '';
  };

  const isChanged = (key: keyof EditableFields): boolean => {
    if (!(key in editFields)) return false;
    const orig = (student as unknown as Record<string, unknown>)[key];
    const origStr = typeof orig === 'object' ? JSON.stringify(orig) : String(orig ?? '');
    const v = editFields[key];
    const vStr = typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
    return vStr !== origStr;
  };

  const handleSave = async () => {
    if (!hasChanges) { setIsEditing(false); return; }
    setEditSaving(true);
    setEditError(null);
    try {
      if (!isDemoModeActive()) {
        await api.students.update(studentId, changedFields as Partial<typeof student>);
      }
      await mutateStudent();
      setEditFields({});
      setIsEditing(false);
    } catch {
      setEditError('Failed to save changes. Please try again.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleLinkContact = async (contactId: number, role: string) => {
    setLinkError(null);
    if (!isDemoModeActive()) {
      await api.studentContact.link({ student_id: studentId, contact_id: contactId, role: role || undefined });
    }
    mutateContacts();
  };

  const handleUnlinkContact = async (contactId: number) => {
    setLinkError(null);
    try {
      if (!isDemoModeActive()) {
        await api.studentContact.unlink({ student_id: studentId, contact_id: contactId });
      }
      mutateContacts();
      setUnlinkConfirm(null);
    } catch (e) {
      const msg = e instanceof Error && e.message.includes('409')
        ? 'Cannot unlink — this contact is designated as Primary Communication or Billing parent. Change the designation first.'
        : 'Failed to unlink contact.';
      setLinkError(msg);
      setUnlinkConfirm(null);
    }
  };

  const handleSetPrimary = async (contactId: number) => {
    setLinkError(null);
    try {
      if (!isDemoModeActive()) {
        await api.students.update(studentId, { primary_contact_id: contactId } as Partial<typeof student>);
      }
      await mutateStudent();
      mutateContacts();
    } catch {
      setLinkError('Failed to set primary contact.');
    }
  };

  const handleSetBilling = async (contactId: number) => {
    setLinkError(null);
    try {
      if (!isDemoModeActive()) {
        await api.students.update(studentId, { billing_contact_id: contactId } as Partial<typeof student>);
      }
      await mutateStudent();
      mutateContacts();
    } catch {
      setLinkError('Failed to set billing contact.');
    }
  };

  const linkedContactIds = new Set(contacts?.map((c) => c.id) ?? []);

  const editScheduleDays = parseScheduleDays(getField('class_schedule_days') || null);
  const editScheduleDetail: ScheduleDetailMap = (editFields.schedule_detail !== undefined
    ? editFields.schedule_detail
    : student?.schedule_detail) || {};

  const toggleDay = (day: string) => {
    const current = new Set(editScheduleDays);
    const newDetail = { ...editScheduleDetail };
    if (current.has(day)) {
      current.delete(day);
      delete newDetail[day];
    } else {
      current.add(day);
      newDetail[day] = { start: '4:00 PM', sort_key: 1600, duration: 60 };
    }
    const ordered = SCHEDULE_DAYS.filter((d) => current.has(d));
    setField('class_schedule_days', ordered.length > 0 ? ordered.join(', ') : null);
    setField('schedule_detail', Object.keys(newDetail).length > 0 ? newDetail : null);
  };

  const updateDayDetail = (day: string, field: 'sort_key' | 'duration', value: number) => {
    const newDetail = { ...editScheduleDetail };
    if (!newDetail[day]) return;
    if (field === 'sort_key') {
      const slot = TIME_SLOTS.find((t) => t.sort_key === value);
      newDetail[day] = { ...newDetail[day], sort_key: value, start: slot?.label || newDetail[day].start };
    } else {
      newDetail[day] = { ...newDetail[day], duration: value };
    }
    setField('schedule_detail', newDetail);
  };

  return (
    <div className={styles.page}>
      {/* ── Section 1: Header ── */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push('/students')}>
          <ArrowLeft size={16} />
          Back to Roster
        </button>
        <div className={styles.headerInfo}>
          <h1 className={styles.studentName}>
            {student.first_name} {student.last_name}
          </h1>
          <div className={styles.headerBadges}>
            <Badge variant="neutral">{student.system_id}</Badge>
            <Badge variant={statusVariant(student.enrollment_status)}>
              {student.enrollment_status}
            </Badge>
            {student.classroom_position && (
              <PosBadge position={student.classroom_position} />
            )}
            <SubjectBadges subjects={student.subjects} />
          </div>
        </div>
      </div>

      <div className={styles.body}>
        {/* ── Section 2: Student Details (grouped) ── */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Student Details</h3>
            {!isEditing ? (
              <button className={styles.addBtn} onClick={startEditing}>
                <Pencil size={14} /> Edit
              </button>
            ) : (
              <div className={styles.editActions}>
                <button
                  className={styles.formSubmit}
                  onClick={handleSave}
                  disabled={editSaving || !hasChanges}
                >
                  {editSaving ? 'Saving...' : 'Save'}
                </button>
                <button className={styles.formCancel} onClick={cancelEditing} disabled={editSaving}>
                  Cancel
                </button>
              </div>
            )}
          </div>

          {editError && (
            <p style={{ color: 'var(--red)', fontSize: 12, margin: '0 0 12px', fontFamily: 'var(--font-primary)' }}>{editError}</p>
          )}

          {/* ── Personal Information ── */}
          <h4 className={styles.groupHeading}>Personal Information</h4>
          <div className={styles.detailsGrid}>
            {isEditing ? (
              <div className={`${styles.detailItem} ${isChanged('date_of_birth') ? styles.fieldChanged : ''}`}>
                <span className={styles.detailLabel}>Date of Birth</span>
                <input type="date" className={styles.editInput} value={getField('date_of_birth')} onChange={(e) => setField('date_of_birth', e.target.value || null)} />
              </div>
            ) : (
              <DetailRow label="Date of Birth" value={student.date_of_birth ?? '—'} />
            )}

            <DetailRow
              label="Birth Month"
              value={
                isEditing && getField('date_of_birth')
                  ? deriveBirthMonth(getField('date_of_birth'))
                  : student.birth_month ? MONTH_NAMES[student.birth_month] : (student.date_of_birth ? deriveBirthMonth(student.date_of_birth) : '—')
              }
            />

            {isEditing ? (
              <div className={`${styles.detailItem} ${isChanged('school') ? styles.fieldChanged : ''}`}>
                <span className={styles.detailLabel}>School</span>
                <input className={styles.editInput} value={getField('school')} onChange={(e) => setField('school', e.target.value || null)} />
              </div>
            ) : (
              <DetailRow label="School" value={student.school ?? '—'} />
            )}

            {isEditing ? (
              <div className={`${styles.detailItem} ${isChanged('grade_level') ? styles.fieldChanged : ''}`}>
                <span className={styles.detailLabel}>Current Grade</span>
                <select className={styles.editSelect} value={getField('grade_level')} onChange={(e) => setField('grade_level', e.target.value || null)}>
                  <option value="">—</option>
                  {GRADE_LEVELS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            ) : (
              <DetailRow label="Current Grade" value={student.grade_level ?? '—'} />
            )}

            {/* TODO: Starting Grade not in cb_students schema yet -- needs db column or ClickUp sync */}
            <DetailRow label="Starting Grade" value="—" />
          </div>

          <hr className={styles.groupDivider} />

          {/* ── Enrollment ── */}
          <h4 className={styles.groupHeading}>Enrollment</h4>
          <div className={styles.detailsGrid}>
            {isEditing ? (
              <div className={`${styles.detailItem} ${isChanged('enroll_date') ? styles.fieldChanged : ''}`}>
                <span className={styles.detailLabel}>Enroll Date</span>
                <input type="date" className={styles.editInput} value={getField('enroll_date')} onChange={(e) => setField('enroll_date', e.target.value || null)} />
              </div>
            ) : (
              <DetailRow label="Enroll Date" value={student.enroll_date ?? '—'} />
            )}

            <DetailRow
              label="Enroll Month"
              value={
                isEditing && getField('enroll_date')
                  ? deriveBirthMonth(getField('enroll_date'))
                  : student.enroll_month ? MONTH_NAMES[student.enroll_month] : (student.enroll_date ? deriveBirthMonth(student.enroll_date) : '—')
              }
            />

            {isEditing ? (
              <div className={`${styles.detailItem} ${isChanged('program_type') ? styles.fieldChanged : ''}`}>
                <span className={styles.detailLabel}>Program Type</span>
                <select className={styles.editSelect} value={getField('program_type')} onChange={(e) => setField('program_type', e.target.value || null)}>
                  <option value="">—</option>
                  {PROGRAM_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            ) : (
              <DetailRow label="Program Type" value={student.program_type ?? '—'} />
            )}

            {isEditing ? (
              <div className={`${styles.detailItem} ${isChanged('subjects') ? styles.fieldChanged : ''}`}>
                <span className={styles.detailLabel}>Subject(s)</span>
                <select className={styles.editSelect} value={getField('subjects')} onChange={(e) => setField('subjects', e.target.value || null)}>
                  <option value="">Select subjects...</option>
                  {SUBJECT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            ) : (
              <DetailRow label="Subject(s)" value={student.subjects ? student.subjects.replace('Math, Reading', 'Math & Reading') : '—'} />
            )}

            {isEditing ? (
              <div className={`${styles.detailItem} ${isChanged('enrollment_status') ? styles.fieldChanged : ''}`}>
                <span className={styles.detailLabel}>Enrollment Status</span>
                <select className={styles.editSelect} value={getField('enrollment_status')} onChange={(e) => setField('enrollment_status', e.target.value)}>
                  {ENROLLMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            ) : (
              <DetailRow label="Enrollment Status" value={student.enrollment_status} />
            )}

            {isEditing ? (
              <div className={`${styles.detailItem} ${isChanged('student_id') ? styles.fieldChanged : ''}`}>
                <span className={styles.detailLabel}>Student ID</span>
                <input className={styles.editInput} value={getField('student_id')} onChange={(e) => setField('student_id', e.target.value || null)} />
              </div>
            ) : (
              <DetailRow label="Student ID" value={student.student_id ?? '—'} />
            )}
          </div>

          <hr className={styles.groupDivider} />

          {/* ── Medical ── */}
          <h4 className={styles.groupHeading}>Medical</h4>
          {isEditing ? (
            <div className={`${styles.detailItem} ${isChanged('medical_notes') ? styles.fieldChanged : ''}`}>
              <span className={styles.detailLabel}>
                <AlertTriangle size={12} style={{ color: 'var(--red)', marginRight: 4 }} />
                Medical / Allergies
              </span>
              <textarea className={styles.editTextarea} value={getField('medical_notes')} onChange={(e) => setField('medical_notes', e.target.value || null)} rows={4} />
            </div>
          ) : (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>
                <AlertTriangle size={12} style={{ color: 'var(--red)', marginRight: 4 }} />
                Medical / Allergies
              </span>
              {student.medical_notes ? (
                <span className={styles.medicalValue}>{student.medical_notes}</span>
              ) : (
                <span className={styles.medicalEmpty}>None on file</span>
              )}
            </div>
          )}

          <hr className={styles.groupDivider} />

          {/* ── Schedule (existing section — do not modify) ── */}
          <h4 className={styles.groupHeading}>Schedule</h4>
          {isEditing ? (
            <div className={`${styles.detailItem} ${isChanged('class_schedule_days') || isChanged('schedule_detail') ? styles.fieldChanged : ''}`}>
              <div className={styles.scheduleGrid}>
                {SCHEDULE_DAYS.map((d) => {
                  const active = editScheduleDays.includes(d);
                  const detail = editScheduleDetail[d];
                  return (
                    <div key={d} className={styles.scheduleCol}>
                      <button
                        type="button"
                        className={`${styles.dayToggle} ${active ? styles.dayToggleActive : ''}`}
                        onClick={() => toggleDay(d)}
                      >
                        {d.slice(0, 3)}
                      </button>
                      {active && detail && (
                        <>
                          <select
                            className={styles.scheduleSelect}
                            value={detail.sort_key}
                            onChange={(e) => updateDayDetail(d, 'sort_key', Number(e.target.value))}
                          >
                            {TIME_SLOTS.map((t) => (
                              <option key={t.sort_key} value={t.sort_key}>{t.label}</option>
                            ))}
                          </select>
                          <select
                            className={styles.scheduleSelect}
                            value={detail.duration}
                            onChange={(e) => updateDayDetail(d, 'duration', Number(e.target.value))}
                          >
                            {DURATION_OPTIONS.map((m) => (
                              <option key={m} value={m}>{m} min</option>
                            ))}
                          </select>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className={styles.detailItem}>
              <div className={styles.scheduleGrid}>
                {SCHEDULE_DAYS.map((d) => {
                  const active = scheduleDays.includes(d);
                  const detail = student.schedule_detail?.[d];
                  return (
                    <div key={d} className={styles.scheduleCol}>
                      <span className={`${styles.dayPill} ${active ? '' : styles.dayPillInactive}`}>
                        {d.slice(0, 3)}
                      </span>
                      {active && detail && (
                        <>
                          <span className={styles.scheduleTime}>{detail.start}</span>
                          <span className={styles.scheduleDuration}>{detail.duration} min</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <hr className={styles.groupDivider} />

          {/* ── Academic Progress ── */}
          <h4 className={styles.groupHeading}>Academic Progress</h4>
          <div className={styles.detailsGrid}>
            {isEditing ? (
              <div className={`${styles.detailItem} ${isChanged('current_level_math') ? styles.fieldChanged : ''}`}>
                <span className={styles.detailLabel}>Current Math Level</span>
                <select className={styles.editSelect} value={getField('current_level_math')} onChange={(e) => setField('current_level_math', e.target.value || null)}>
                  <option value="">—</option>
                  {MATH_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            ) : (
              <DetailRow label="Current Math Level" value={student.current_level_math ?? '—'} />
            )}

            {isEditing ? (
              <div className={`${styles.detailItem} ${isChanged('current_level_reading') ? styles.fieldChanged : ''}`}>
                <span className={styles.detailLabel}>Current Reading Level</span>
                <select className={styles.editSelect} value={getField('current_level_reading')} onChange={(e) => setField('current_level_reading', e.target.value || null)}>
                  <option value="">—</option>
                  {READING_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            ) : (
              <DetailRow label="Current Reading Level" value={student.current_level_reading ?? '—'} />
            )}

            {isEditing ? (
              <div className={`${styles.detailItem} ${isChanged('ashr_math_status') ? styles.fieldChanged : ''}`}>
                <span className={styles.detailLabel}>ASHR Math Status</span>
                <select className={styles.editSelect} value={getField('ashr_math_status')} onChange={(e) => setField('ashr_math_status', e.target.value || null)}>
                  <option value="">—</option>
                  {ASHR_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            ) : (
              <DetailRow label="ASHR Math Status" value={student.ashr_math_status ?? '—'} />
            )}

            {isEditing ? (
              <div className={`${styles.detailItem} ${isChanged('ashr_reading_status') ? styles.fieldChanged : ''}`}>
                <span className={styles.detailLabel}>ASHR Reading Status</span>
                <select className={styles.editSelect} value={getField('ashr_reading_status')} onChange={(e) => setField('ashr_reading_status', e.target.value || null)}>
                  <option value="">—</option>
                  {ASHR_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            ) : (
              <DetailRow label="ASHR Reading Status" value={student.ashr_reading_status ?? '—'} />
            )}
          </div>

          <hr className={styles.groupDivider} />

          {/* ── Kumon Connect ── */}
          <h4 className={styles.groupHeading}>Kumon Connect</h4>
          <div className={styles.detailsGrid}>
            {isEditing ? (
              <div className={`${styles.detailItem} ${isChanged('kc_username') ? styles.fieldChanged : ''}`}>
                <span className={styles.detailLabel}>KC Username</span>
                <input className={styles.editInput} value={getField('kc_username')} onChange={(e) => setField('kc_username', e.target.value || null)} />
              </div>
            ) : (
              <DetailRow label="KC Username" value={student.kc_username ?? '—'} />
            )}

            {isEditing ? (
              <div className={`${styles.detailItem} ${isChanged('kc_password') ? styles.fieldChanged : ''}`}>
                <span className={styles.detailLabel}>KC Password</span>
                <input className={styles.editInput} value={getField('kc_password')} onChange={(e) => setField('kc_password', e.target.value || null)} />
              </div>
            ) : (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>KC Password</span>
                <span className={styles.detailValue}>
                  {showKcPw ? (student.kc_password ?? '—') : (student.kc_password ? '••••••' : '—')}
                  {student.kc_password && (
                    <button className={styles.eyeBtn} onClick={() => setShowKcPw(!showKcPw)}>
                      {showKcPw ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                  )}
                </span>
              </div>
            )}
          </div>

          <hr className={styles.groupDivider} />

          {/* ── Student Journal ── */}
          <StudentJournal
            studentId={studentId}
            staffId={staffId}
            staffName={session?.user?.name || 'Staff'}
          />

          {/* Future sections: Progress Meetings, Attendance, Absence/Vacation, Classroom Observation Log */}
        </div>

        {/* ── Section 2b: Parents / Guardians ── */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              Parents / Guardians
              {contacts && contacts.length > 0 && (
                <span className={styles.count}>{contacts.length}</span>
              )}
            </h3>
            <button className={styles.addBtn} onClick={() => setShowLinkContact(true)}>
              <Link2 size={14} /> Link Contact
            </button>
          </div>

          {linkError && (
            <p style={{ color: 'var(--red)', fontSize: 12, margin: '0 0 12px', fontFamily: 'var(--font-primary)' }}>{linkError}</p>
          )}

          {contactsLoading && (
            <p className={styles.empty}>Loading contacts...</p>
          )}

          {contactsError && (
            <div className={styles.contactsError}>
              <p>Unable to load contacts.</p>
              <button className={styles.retryBtn} onClick={() => mutateContacts()}>
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          )}

          {!contactsLoading && !contactsError && (!contacts || contacts.length === 0) && (
            <EmptyState icon={Users} title="No parents or guardians linked yet" description="" />
          )}

          {contacts && contacts.length > 0 && (
            <div className={styles.contactList}>
              {contacts.map((c) => (
                <div key={c.id} className={styles.contactCard}>
                  <div className={styles.contactInfo}>
                    <span className={styles.contactName}>
                      {c.first_name} {c.last_name}
                    </span>
                    <div className={styles.contactBadges}>
                      {c.relationship_to_students && (
                        <Badge variant="neutral">{c.relationship_to_students}</Badge>
                      )}
                      {c.is_primary_contact && (
                        <Badge variant="reading">Primary</Badge>
                      )}
                      {c.is_billing_contact && (
                        <Badge variant="math">Billing</Badge>
                      )}
                    </div>
                  </div>
                  <div className={styles.contactActions}>
                    <div className={styles.contactDetails}>
                      {c.phone && (
                        <a href={`tel:${c.phone}`} className={styles.contactLink}>
                          <Phone size={12} /> {c.phone}
                        </a>
                      )}
                      {c.email && (
                        <a href={`mailto:${c.email}`} className={styles.contactLink}>
                          <Mail size={12} /> {c.email}
                        </a>
                      )}
                    </div>
                    <div className={styles.cardBtnRow}>
                      {!c.is_primary_contact && (
                        <button className={styles.cardBtn} onClick={() => handleSetPrimary(c.id)} title="Set as Primary Communication">
                          <Crown size={12} /> Primary
                        </button>
                      )}
                      {!c.is_billing_contact && (
                        <button className={styles.cardBtn} onClick={() => handleSetBilling(c.id)} title="Set as Billing Contact">
                          <CreditCard size={12} /> Billing
                        </button>
                      )}
                      {unlinkConfirm === c.id ? (
                        <span className={styles.confirmRow}>
                          <span className={styles.confirmText}>Unlink?</span>
                          <button className={styles.confirmYes} onClick={() => handleUnlinkContact(c.id)}>Yes</button>
                          <button className={styles.confirmNo} onClick={() => setUnlinkConfirm(null)}>No</button>
                        </span>
                      ) : (
                        <button className={styles.unlinkBtn} onClick={() => setUnlinkConfirm(c.id)} title="Unlink contact">
                          <Unlink size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showLinkContact && (
          <LinkPickerModal
            title="Link Contact"
            items={(allContacts ?? []).map((c) => ({
              id: c.id,
              label: `${c.last_name}, ${c.first_name}`,
              sub: c.email || c.phone || '',
              linked: linkedContactIds.has(c.id),
            }))}
            loading={allContactsLoading}
            onLink={handleLinkContact}
            onClose={() => setShowLinkContact(false)}
          />
        )}

        {/* ── Section 3: Tasks ── */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              Tasks <span className={styles.count}>{openTasks.length} open</span>
            </h3>
            <button
              className={styles.addBtn}
              onClick={() => setShowTaskForm(!showTaskForm)}
            >
              <Plus size={14} />
              Add Task
            </button>
          </div>

          {showTaskForm && (
            <div className={styles.inlineForm}>
              <input
                className={styles.formInput}
                placeholder="Task title..."
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
              />
              <div className={styles.formRow}>
                <select
                  className={styles.formSelect}
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value as CbTaskType)}
                >
                  {Object.entries(TASK_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <input
                  className={styles.formInput}
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                />
                <select
                  className={styles.formSelect}
                  value={taskAssignedTo}
                  onChange={(e) => setTaskAssignedTo(Number(e.target.value))}
                >
                  {staffList?.map((s) => (
                    <option key={s.id} value={s.id}>{s.full_name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formActions}>
                <button
                  className={styles.formSubmit}
                  disabled={!taskTitle.trim() || taskSaving}
                  onClick={handleCreateTask}
                >
                  {taskSaving ? 'Saving...' : 'Create Task'}
                </button>
                <button className={styles.formCancel} onClick={() => setShowTaskForm(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {taskError && (
            <p style={{ color: 'var(--red)', fontSize: 12, margin: '0 0 12px', fontFamily: 'var(--font-primary)' }}>{taskError}</p>
          )}

          <div className={styles.taskList}>
            {openTasks.length === 0 && (
              <p className={styles.empty}>No open tasks.</p>
            )}
            {openTasks.map((t) => (
              <div key={t.id} className={styles.taskCard}>
                <div className={styles.taskInfo}>
                  <span className={styles.taskTitle}>{t.title}</span>
                  <div className={styles.taskMeta}>
                    <Badge variant="info">{TASK_TYPE_LABELS[t.type]}</Badge>
                    {t.due_date && <span className={styles.taskDue}>Due {t.due_date}</span>}
                  </div>
                </div>
                <button
                  className={styles.completeBtn}
                  onClick={() => handleCompleteTask(t.id)}
                >
                  <CheckCircle2 size={14} />
                  Complete
                </button>
              </div>
            ))}
          </div>

          {completedTasks.length > 0 && (
            <>
              <button
                className={styles.toggleCompleted}
                onClick={() => setShowCompleted(!showCompleted)}
              >
                {showCompleted ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showCompleted ? 'Hide' : 'Show'} completed ({completedTasks.length})
              </button>
              {showCompleted && (
                <div className={styles.taskList}>
                  {completedTasks.map((t) => (
                    <div key={t.id} className={`${styles.taskCard} ${styles.taskDone}`}>
                      <div className={styles.taskInfo}>
                        <span className={styles.taskTitle}>{t.title}</span>
                        <div className={styles.taskMeta}>
                          <Badge variant="neutral">{TASK_TYPE_LABELS[t.type]}</Badge>
                          {t.completed_at && (
                            <span className={styles.taskDue}>
                              Completed {new Date(t.completed_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Section 4: Daily Observation + Notes History ── */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Daily Observation</h3>
          <div className={styles.noteInputWrap}>
            <textarea
              className={styles.noteInput}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={handleNoteKeyDown}
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

          <h3 className={`${styles.sectionTitle} ${styles.notesHistoryTitle}`}>
            Notes History <span className={styles.count}>{notes?.length ?? 0}</span>
          </h3>
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
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  const display = value == null ? '—' : typeof value === 'object' ? String(value) : value;
  return (
    <div className={styles.detailItem}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{display}</span>
    </div>
  );
}
