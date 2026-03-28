'use client';

import { useState, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import useSWR, { mutate as globalMutate } from 'swr';
import {
  LogOut, UserCircle, Key, Eye, EyeOff,
  ClipboardList, Plus, Check, Inbox,
  Calendar, Trash2, Search, X as XIcon,
} from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { useActiveStaff } from '@/hooks/useStaff';
import { useStudents } from '@/hooks/useStudents';
import type { CbTask, CbTaskType, CreateTaskRequest } from '@/lib/types';
import styles from './MePage.module.css';

const TASK_TYPE_LABELS: Record<CbTaskType, string> = {
  birthday: 'Birthday',
  progress_meeting_prep: 'Meeting Prep',
  progress_meeting_followup: 'Meeting Follow-up',
  goals: 'Goals',
  checkin_call: 'Check-in Call',
  form_followup: 'Form Follow-up',
  no_show_followup: 'No-show Follow-up',
  general: 'General',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function dueDateColor(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr < today) return 'var(--red)';
  if (dateStr === today) return '#d97706';
  return 'var(--neutral)';
}

function formatDueDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function sortTasks(a: CbTask, b: CbTask): number {
  if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

export default function MePage() {
  const { data: session } = useSession();
  const user = session?.user;
  const role = (user as { role?: string } | undefined)?.role ?? 'staff';
  const staffId = (user as { id?: string } | undefined)?.id;
  const staffIdNum = Number(staffId) || 0;
  const isAdmin = role === 'admin' || role === 'superuser';

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Task UI state
  const [taskTab, setTaskTab] = useState<'inbox' | 'mine' | 'sent'>('inbox');
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<CbTaskType>('general');
  const [newAssignTo, setNewAssignTo] = useState<number>(0);
  const [newStudentId, setNewStudentId] = useState<number | null>(null);
  const [newStudentName, setNewStudentName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentSearch, setShowStudentSearch] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Data
  const { data: staff } = useActiveStaff();
  const { data: students } = useStudents();

  const swrKey = staffId ? `my-tasks-${staffId}` : null;
  const { data: tasks, error: tasksError, isLoading: tasksLoading } = useSWR<CbTask[]>(
    swrKey,
    () => api.tasks.forAssignee(staffIdNum),
    { dedupingInterval: 5000, revalidateOnFocus: true }
  );

  const sentSwrKey = isAdmin && staffId ? `sent-tasks-${staffId}` : null;
  const { data: rawSentTasks } = useSWR<CbTask[]>(
    sentSwrKey,
    () => api.tasks.forCreator(staffIdNum),
    { dedupingInterval: 5000, revalidateOnFocus: true }
  );

  // Lookup maps
  const staffMap = useMemo(() => {
    const m = new Map<number, string>();
    staff?.forEach((s) => m.set(s.id, s.full_name));
    return m;
  }, [staff]);

  const studentMap = useMemo(() => {
    const m = new Map<number, { first: string; last: string }>();
    students?.forEach((s) => m.set(s.id, { first: s.first_name, last: s.last_name }));
    return m;
  }, [students]);

  // Tab data
  const inboxTasks = useMemo(
    () => [...(tasks || []).filter((t) => t.assigned_to === staffIdNum && t.created_by !== staffIdNum)].sort(sortTasks),
    [tasks, staffIdNum]
  );
  const mineTasks = useMemo(
    () => [...(tasks || []).filter((t) => t.created_by === staffIdNum)].sort(sortTasks),
    [tasks, staffIdNum]
  );
  const sentTasks = useMemo(
    () =>
      [...(rawSentTasks || []).filter((t) => t.assigned_to !== staffIdNum)].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [rawSentTasks, staffIdNum]
  );

  const inboxOpenCount = inboxTasks.filter((t) => t.status === 'open').length;
  const mineOpenCount = mineTasks.filter((t) => t.status === 'open').length;
  const currentTabTasks = taskTab === 'inbox' ? inboxTasks : taskTab === 'mine' ? mineTasks : sentTasks;

  // Student search
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim() || !students) return [];
    const q = studentSearch.toLowerCase();
    return students
      .filter((s) => `${s.first_name} ${s.last_name}`.toLowerCase().includes(q))
      .slice(0, 6);
  }, [students, studentSearch]);

  const openAddTaskForm = () => {
    setNewTitle('');
    setNewType('general');
    setNewAssignTo(staffIdNum);
    setNewStudentId(null);
    setNewStudentName('');
    setNewNotes('');
    setNewDueDate('');
    setStudentSearch('');
    setShowStudentSearch(false);
    setShowAddTask(true);
  };

  const handleCompleteTask = async (task: CbTask) => {
    const newStatus = task.status === 'open' ? 'complete' : 'open';
    if (tasks) {
      globalMutate(
        swrKey,
        tasks.map((t) =>
          t.id === task.id
            ? ({ ...t, status: newStatus, completed_at: newStatus === 'complete' ? new Date().toISOString() : null } as CbTask)
            : t
        ),
        false
      );
    }
    await api.tasks.update(task.id, { status: newStatus });
    globalMutate(swrKey);
  };

  const handleAddTask = async () => {
    if (!newTitle.trim() || !staffId) return;
    setAddingTask(true);
    const effectiveAssignTo = isAdmin ? (newAssignTo || staffIdNum) : staffIdNum;
    const data: CreateTaskRequest = {
      assigned_to: effectiveAssignTo,
      created_by: staffIdNum,
      type: newType,
      title: newTitle.trim(),
      notes: newNotes.trim() || null,
      due_date: newDueDate || null,
      student_id: newStudentId ?? undefined,
    };
    await api.tasks.create(data);
    globalMutate(swrKey);
    if (sentSwrKey) globalMutate(sentSwrKey);
    setShowAddTask(false);
    setAddingTask(false);
  };

  const handleDeleteTask = async (taskId: number) => {
    await api.tasks.delete(taskId);
    globalMutate(swrKey);
    if (sentSwrKey) globalMutate(sentSwrKey);
    setConfirmDeleteId(null);
  };

  const handleChangePassword = async () => {
    setPwMessage(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwMessage({ type: 'error', text: 'All fields are required.' });
      return;
    }
    if (newPassword.length < 8) {
      setPwMessage({ type: 'error', text: 'New password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch('/api/staff/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPwMessage({ type: 'success', text: 'Password updated successfully.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPwMessage({ type: 'error', text: data.message || data.error || 'Failed to update password.' });
      }
    } catch {
      setPwMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <SectionHeader
          script="Your"
          title="Profile"
          subtitle="Account info and session management"
        />
      </div>

      <div className={styles.content}>
        <Card className={styles.profileCard}>
          <div className={styles.avatar}>
            <UserCircle size={48} strokeWidth={1.5} />
          </div>
          <div className={styles.info}>
            <h3 className={styles.name}>{user?.name ?? 'Loading...'}</h3>
            <p className={styles.email}>{user?.email ?? ''}</p>
            <div className={styles.roleBadge}>
              <Badge variant={role === 'superuser' ? 'math' : role === 'admin' ? 'reading' : 'staff'}>
                {role}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Tasks */}
        {staffId ? (
          <Card className={styles.actionsCard}>
            <div className={styles.tasksHeader}>
              <h4 className={styles.tasksTitle}>
                <ClipboardList size={15} /> Tasks
              </h4>
              <button
                className={styles.addTaskBtn}
                onClick={showAddTask ? () => setShowAddTask(false) : openAddTaskForm}
              >
                <Plus size={13} /> New
              </button>
            </div>

            {/* Create task form */}
            {showAddTask && (
              <div className={styles.addTaskForm}>
                <input
                  className={styles.addTaskInput}
                  placeholder="Task title..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                  autoFocus
                />

                {isAdmin && (
                  <div className={styles.addTaskField}>
                    <label className={styles.addTaskLabel}>Assign to</label>
                    <select
                      className={styles.addTaskSelect}
                      value={newAssignTo || staffIdNum}
                      onChange={(e) => setNewAssignTo(Number(e.target.value))}
                    >
                      {staff?.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name} ({s.role})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Student context */}
                {newStudentId ? (
                  <div className={styles.studentPill}>
                    <span>re: {newStudentName}</span>
                    <button
                      className={styles.studentPillRemove}
                      onClick={() => { setNewStudentId(null); setNewStudentName(''); }}
                    >
                      <XIcon size={11} />
                    </button>
                  </div>
                ) : showStudentSearch ? (
                  <div className={styles.studentSearchWrap}>
                    <div className={styles.studentSearchInputRow}>
                      <Search size={13} className={styles.studentSearchIcon} />
                      <input
                        className={styles.studentSearchInput}
                        placeholder="Search students..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        autoFocus
                      />
                      <button
                        className={styles.studentSearchCancel}
                        onClick={() => { setShowStudentSearch(false); setStudentSearch(''); }}
                      >
                        <XIcon size={13} />
                      </button>
                    </div>
                    {filteredStudents.length > 0 && (
                      <div className={styles.studentSearchResults}>
                        {filteredStudents.map((s) => (
                          <button
                            key={s.id}
                            className={styles.studentSearchResult}
                            onClick={() => {
                              setNewStudentId(s.id);
                              setNewStudentName(`${s.first_name} ${s.last_name}`);
                              setShowStudentSearch(false);
                              setStudentSearch('');
                            }}
                          >
                            {s.first_name} {s.last_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    className={styles.linkStudentBtn}
                    onClick={() => setShowStudentSearch(true)}
                  >
                    <Plus size={11} /> Link student
                  </button>
                )}

                <textarea
                  className={styles.addTaskNotes}
                  placeholder="Add details or message..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={3}
                />

                <div className={styles.addTaskRow}>
                  <div className={styles.addTaskField} style={{ flex: 1 }}>
                    <label className={styles.addTaskLabel}>Due date</label>
                    <input
                      type="date"
                      className={styles.addTaskDateInput}
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                    />
                  </div>
                  <div className={styles.addTaskField} style={{ flex: 1 }}>
                    <label className={styles.addTaskLabel}>Type</label>
                    <select
                      className={styles.addTaskSelect}
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as CbTaskType)}
                    >
                      {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.addTaskRow}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAddTask}
                    disabled={addingTask || !newTitle.trim()}
                  >
                    {addingTask ? 'Creating...' : 'Create Task'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowAddTask(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className={styles.taskTabs}>
              <button
                className={`${styles.taskTab} ${taskTab === 'inbox' ? styles.taskTabActive : ''}`}
                onClick={() => setTaskTab('inbox')}
              >
                Inbox
                {inboxOpenCount > 0 && <span className={styles.taskTabCount}>{inboxOpenCount}</span>}
              </button>
              <button
                className={`${styles.taskTab} ${taskTab === 'mine' ? styles.taskTabActive : ''}`}
                onClick={() => setTaskTab('mine')}
              >
                My Tasks
                {mineOpenCount > 0 && <span className={styles.taskTabCount}>{mineOpenCount}</span>}
              </button>
              {isAdmin && (
                <button
                  className={`${styles.taskTab} ${taskTab === 'sent' ? styles.taskTabActive : ''}`}
                  onClick={() => setTaskTab('sent')}
                >
                  Sent
                </button>
              )}
            </div>

            {tasksLoading && <p className={styles.sectionDesc}>Loading tasks...</p>}
            {tasksError && <p className={styles.msgError}>Failed to load tasks.</p>}

            {!tasksLoading && !tasksError && currentTabTasks.length === 0 && (
              <div className={styles.emptyTasks}>
                <div className={styles.emptyTasksIcon}>
                  <Inbox size={32} strokeWidth={1.5} />
                </div>
                <p className={styles.emptyTasksText}>
                  {taskTab === 'inbox' ? 'Nothing assigned to you' :
                   taskTab === 'mine' ? 'No tasks created by you' :
                   'No tasks sent to others'}
                </p>
              </div>
            )}

            {currentTabTasks.length > 0 && (
              <div className={styles.taskList}>
                {currentTabTasks.map((task) => {
                  const done = task.status === 'complete';
                  const creatorName = task.created_by !== staffIdNum
                    ? (staffMap.get(task.created_by) ?? `Staff #${task.created_by}`)
                    : null;
                  const assigneeName = task.assigned_to !== staffIdNum
                    ? (staffMap.get(task.assigned_to) ?? `Staff #${task.assigned_to}`)
                    : null;
                  const studentInfo = task.student_id ? studentMap.get(task.student_id) : null;
                  const canDelete = isAdmin || task.created_by === staffIdNum;

                  return (
                    <div key={task.id} className={`${styles.taskItem} ${done ? styles.taskItemDone : ''}`}>
                      {taskTab !== 'sent' && (
                        <button
                          className={done ? styles.taskCheckDone : styles.taskCheck}
                          onClick={() => handleCompleteTask(task)}
                          title={done ? 'Mark open' : 'Mark complete'}
                        >
                          {done && <Check size={12} color="#fff" strokeWidth={3} />}
                        </button>
                      )}

                      <div className={styles.taskBody}>
                        <p className={done ? styles.taskTitleDone : styles.taskTitleText}>
                          {task.title}
                        </p>

                        {creatorName && taskTab === 'inbox' && (
                          <p className={styles.taskFrom}>From: {creatorName}</p>
                        )}
                        {assigneeName && taskTab === 'sent' && (
                          <p className={styles.taskFrom}>To: {assigneeName}</p>
                        )}

                        {studentInfo && task.student_id && (
                          <Link href={`/students/${task.student_id}`} className={styles.taskStudentLink}>
                            re: {studentInfo.first} {studentInfo.last}
                          </Link>
                        )}

                        {task.notes && (
                          <p className={styles.taskNotes}>{task.notes}</p>
                        )}

                        <div className={styles.taskMeta}>
                          {task.due_date && (
                            <span
                              className={styles.taskDueDate}
                              style={{ color: dueDateColor(task.due_date) }}
                            >
                              <Calendar size={10} />
                              {formatDueDate(task.due_date)}
                            </span>
                          )}
                          <span className={styles.taskTypeBadge}>
                            {TASK_TYPE_LABELS[task.type] || task.type}
                          </span>
                          <span className={styles.taskDate}>{timeAgo(task.created_at)}</span>
                          {taskTab === 'sent' && (
                            <span className={done ? styles.taskStatusDone : styles.taskStatusOpen}>
                              {done ? 'Done' : 'Open'}
                            </span>
                          )}
                        </div>
                      </div>

                      {canDelete && (
                        <div className={styles.taskActions}>
                          {confirmDeleteId === task.id ? (
                            <>
                              <button
                                className={styles.taskDeleteConfirm}
                                onClick={() => handleDeleteTask(task.id)}
                              >
                                Delete?
                              </button>
                              <button
                                className={styles.taskDeleteCancel}
                                onClick={() => setConfirmDeleteId(null)}
                              >
                                <XIcon size={11} />
                              </button>
                            </>
                          ) : (
                            <button
                              className={styles.taskDeleteBtn}
                              onClick={() => setConfirmDeleteId(task.id)}
                              title="Delete task"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        ) : (
          <Card className={styles.actionsCard}>
            <p className={styles.sectionDesc}>Staff profile not linked. Tasks unavailable.</p>
          </Card>
        )}

        <Card className={styles.actionsCard}>
          <h4 className={styles.sectionTitle}>
            <Key size={15} /> Change Password
          </h4>
          <p className={styles.sectionDesc}>
            Update your Center Book Operations password.
          </p>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Current Password</label>
            <div className={styles.passwordWrap}>
              <input
                type={showCurrent ? 'text' : 'password'}
                className={styles.fieldInput}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.toggleVis}
                onClick={() => setShowCurrent(!showCurrent)}
                aria-label={showCurrent ? 'Hide password' : 'Show password'}
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>New Password</label>
            <div className={styles.passwordWrap}>
              <input
                type={showNew ? 'text' : 'password'}
                className={styles.fieldInput}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className={styles.toggleVis}
                onClick={() => setShowNew(!showNew)}
                aria-label={showNew ? 'Hide password' : 'Show password'}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Confirm New Password</label>
            <div className={styles.passwordWrap}>
              <input
                type={showNew ? 'text' : 'password'}
                className={styles.fieldInput}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>

          {pwMessage && (
            <p className={pwMessage.type === 'success' ? styles.msgSuccess : styles.msgError}>
              {pwMessage.text}
            </p>
          )}

          <Button variant="primary" size="md" onClick={handleChangePassword} disabled={pwLoading}>
            {pwLoading ? 'Updating...' : 'Update Password'}
          </Button>
        </Card>

        <Card className={styles.actionsCard}>
          <h4 className={styles.sectionTitle}>Session</h4>
          <p className={styles.sectionDesc}>
            Sign out of The Center Book Operations on this device.
          </p>
          <Button variant="secondary" size="md" onClick={() => signOut({ callbackUrl: '/login' })}>
            <LogOut size={16} />
            Sign Out
          </Button>
        </Card>
      </div>
    </div>
  );
}
