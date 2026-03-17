'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';
import Badge from '@/components/ui/Badge';
import SubjectBadges from '@/components/SubjectBadges';
import PosBadge from '@/components/PosBadge';
import NoteCard from '@/components/NoteCard';
import VisibilityLabel from '@/components/VisibilityLabel';
import EmptyState from '@/components/ui/EmptyState';
import { useStudent } from '@/hooks/useStudents';
import { useStudentTasks, completeTask, createTask } from '@/hooks/useStudentTasks';
import { useNotes, createNote } from '@/hooks/useNotes';
import { useActiveStaff } from '@/hooks/useStaff';
import { parseSubjects, parseScheduleDays, formatTimeKey } from '@/lib/types';
import type { CbTaskType, NoteVisibility } from '@/lib/types';
import styles from './StudentProfilePage.module.css';

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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
  const { data: student, isLoading } = useStudent(studentId);
  const { data: tasks, mutate: mutateTasks } = useStudentTasks(studentId);
  const { data: notes } = useNotes(studentId);
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

  // Notes / Daily Observation
  const [noteText, setNoteText] = useState('');
  const [noteVis, setNoteVis] = useState<NoteVisibility>('staff');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

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

  const handleNoteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddNote();
    }
  };

  const handleCompleteTask = async (taskId: number) => {
    await completeTask(taskId, studentId);
    mutateTasks();
  };

  const handleCreateTask = async () => {
    if (!taskTitle.trim()) return;
    setTaskSaving(true);
    await createTask(
      {
        student_id: studentId,
        assigned_to: taskAssignedTo,
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
    setTaskSaving(false);
    mutateTasks();
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
        {/* ── Section 2: Details Grid ── */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Student Details</h3>
          <div className={styles.detailsGrid}>
            <DetailRow label="Date of Birth" value={student.date_of_birth ?? '—'} />
            <DetailRow label="Birth Month" value={student.birth_month ? MONTH_NAMES[student.birth_month] : '—'} />
            <DetailRow label="Enroll Date" value={student.enroll_date ?? '—'} />
            <DetailRow label="Enroll Month" value={student.enroll_month ? MONTH_NAMES[student.enroll_month] : '—'} />
            <DetailRow label="Starting Grade" value={student.starting_grade_level ?? '—'} />
            <DetailRow label="Current Grade" value={student.grade_level ?? '—'} />
            <DetailRow label="School" value={student.school ?? '—'} />
            <DetailRow label="Program Type" value={student.program_type ?? '—'} />
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Schedule</span>
              <div className={styles.dayPills}>
                {scheduleDays.map((d) => (
                  <span key={d} className={styles.dayPill}>{d.slice(0, 3)}</span>
                ))}
                {student.class_time_sort_key && (
                  <span className={styles.timePill}>{formatTimeKey(student.class_time_sort_key)}</span>
                )}
              </div>
            </div>
            <DetailRow label="Current Math Level" value={student.current_level_math ?? '—'} />
            <DetailRow label="Current Reading Level" value={student.current_level_reading ?? '—'} />
            <DetailRow label="ASHR Math" value={student.ashr_math_status ?? '—'} />
            <DetailRow label="ASHR Reading" value={student.ashr_reading_status ?? '—'} />
            <DetailRow label="Student ID" value={student.student_id ?? '—'} />
            <DetailRow label="KC Username" value={student.kc_username ?? '—'} />
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
            {student.medical_notes && (
              <div className={`${styles.detailItem} ${styles.detailFull}`}>
                <span className={styles.detailLabel}>
                  <AlertTriangle size={12} style={{ color: 'var(--red)', marginRight: 4 }} />
                  Medical / Allergies
                </span>
                <span className={styles.medicalValue}>{student.medical_notes}</span>
              </div>
            )}
          </div>
        </div>

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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.detailItem}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value}</span>
    </div>
  );
}
