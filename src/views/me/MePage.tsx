'use client';

import { useState, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react';
import useSWR, { mutate as globalMutate } from 'swr';
import {
  LogOut, UserCircle, Key, Eye, EyeOff,
  ClipboardList, Plus, Check, Inbox,
} from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { useDemoMode, isDemoModeActive } from '@/context/MockDataContext';
import { MOCK_TASKS } from '@/lib/mock-data';
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

export default function MePage() {
  const { data: session } = useSession();
  const { isDemoMode } = useDemoMode();

  const user = session?.user;
  const role = (user as { role?: string } | undefined)?.role ?? 'staff';
  const staffId = (user as { id?: string } | undefined)?.id;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Task creation form state
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<CbTaskType>('general');
  const [addingTask, setAddingTask] = useState(false);

  const swrKey = staffId
    ? (isDemoMode ? `demo-my-tasks-${staffId}` : `my-tasks-${staffId}`)
    : null;

  const { data: tasks, error: tasksError, isLoading: tasksLoading } = useSWR<CbTask[]>(
    swrKey,
    async () => {
      if (isDemoMode) {
        return MOCK_TASKS.filter((t) => t.assigned_to === Number(staffId));
      }
      // Fetch all tasks and filter client-side (small dataset, assigned_to filter not confirmed)
      const all = await api.tasks.forAssignee(Number(staffId));
      return all;
    },
    { dedupingInterval: isDemoMode ? 60000 : 5000, revalidateOnFocus: true }
  );

  const sortedTasks = useMemo(() => {
    if (!tasks) return [];
    return [...tasks].sort((a, b) => {
      // Open first, then by created_at desc
      if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [tasks]);

  const openCount = useMemo(() => tasks?.filter((t) => t.status === 'open').length ?? 0, [tasks]);

  const handleCompleteTask = async (task: CbTask) => {
    const newStatus = task.status === 'open' ? 'complete' : 'open';
    // Optimistic update
    if (tasks) {
      globalMutate(
        swrKey,
        tasks.map((t) => t.id === task.id ? { ...t, status: newStatus, completed_at: newStatus === 'complete' ? new Date().toISOString() : null } as CbTask : t),
        false
      );
    }
    if (!isDemoModeActive()) {
      await api.tasks.update(task.id, { status: newStatus });
    }
    globalMutate(swrKey);
  };

  const handleAddTask = async () => {
    if (!newTitle.trim() || !staffId) return;
    setAddingTask(true);
    const data: CreateTaskRequest = {
      assigned_to: Number(staffId),
      type: newType,
      title: newTitle.trim(),
    };
    if (isDemoModeActive()) {
      const task: CbTask = {
        id: Date.now(),
        student_id: null,
        contact_id: null,
        assigned_to: Number(staffId),
        created_by: Number(staffId),
        type: newType,
        title: newTitle.trim(),
        notes: null,
        due_date: null,
        status: 'open',
        recurrence_rule: null,
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      MOCK_TASKS.push(task);
    } else {
      await api.tasks.create(data);
    }
    globalMutate(swrKey);
    setNewTitle('');
    setNewType('general');
    setShowAddTask(false);
    setAddingTask(false);
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
        setPwMessage({
          type: 'error',
          text: data.message || data.error || 'Failed to update password.',
        });
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

        {/* My Tasks */}
        {staffId ? (
          <Card className={styles.actionsCard}>
            <div className={styles.tasksHeader}>
              <div className={styles.tasksHeaderLeft}>
                <h4 className={styles.tasksTitle}>
                  <ClipboardList size={15} /> My Tasks
                </h4>
                {openCount > 0 && (
                  <span className={styles.taskCount}>{openCount}</span>
                )}
              </div>
              <button
                className={styles.addTaskBtn}
                onClick={() => setShowAddTask(!showAddTask)}
              >
                <Plus size={13} /> Add
              </button>
            </div>

            {showAddTask && (
              <div className={styles.addTaskForm}>
                <div className={styles.addTaskRow}>
                  <input
                    className={styles.addTaskInput}
                    placeholder="Task title..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                    autoFocus
                  />
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
                <div className={styles.addTaskRow}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAddTask}
                    disabled={addingTask || !newTitle.trim()}
                  >
                    {addingTask ? 'Adding...' : 'Add Task'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => { setShowAddTask(false); setNewTitle(''); }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {tasksLoading && (
              <p className={styles.sectionDesc}>Loading tasks...</p>
            )}

            {tasksError && (
              <p className={styles.msgError}>Failed to load tasks.</p>
            )}

            {!tasksLoading && !tasksError && sortedTasks.length === 0 && (
              <div className={styles.emptyTasks}>
                <div className={styles.emptyTasksIcon}>
                  <Inbox size={32} strokeWidth={1.5} />
                </div>
                <p className={styles.emptyTasksText}>No tasks assigned to you</p>
              </div>
            )}

            {sortedTasks.length > 0 && (
              <div className={styles.taskList}>
                {sortedTasks.map((task) => {
                  const done = task.status === 'complete';
                  return (
                    <div key={task.id} className={styles.taskItem}>
                      <button
                        className={done ? styles.taskCheckDone : styles.taskCheck}
                        onClick={() => handleCompleteTask(task)}
                        title={done ? 'Mark open' : 'Mark complete'}
                      >
                        {done && <Check size={12} color="#fff" strokeWidth={3} />}
                      </button>
                      <div className={styles.taskBody}>
                        <p
                          className={done ? styles.taskTitleDone : styles.taskTitleText}
                          title={task.title}
                        >
                          {task.title}
                        </p>
                        <div className={styles.taskMeta}>
                          <span className={styles.taskTypeBadge}>
                            {TASK_TYPE_LABELS[task.type] || task.type}
                          </span>
                          <span className={styles.taskDate}>
                            {timeAgo(task.created_at)}
                          </span>
                        </div>
                      </div>
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

          <Button
            variant="primary"
            size="md"
            onClick={handleChangePassword}
            disabled={pwLoading}
          >
            {pwLoading ? 'Updating...' : 'Update Password'}
          </Button>
        </Card>

        <Card className={styles.actionsCard}>
          <h4 className={styles.sectionTitle}>Session</h4>
          <p className={styles.sectionDesc}>
            Sign out of The Center Book Operations on this device.
          </p>
          <Button
            variant="secondary"
            size="md"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut size={16} />
            Sign Out
          </Button>
        </Card>
      </div>
    </div>
  );
}
