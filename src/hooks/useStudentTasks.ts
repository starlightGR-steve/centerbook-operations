import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import { MOCK_TASKS } from '@/lib/mock-data';
import { useDemoMode, isDemoModeActive } from '@/context/MockDataContext';
import type { CbTask, CreateTaskRequest } from '@/lib/types';

/** Fetch open tasks for a student */
export function useStudentTasks(studentId: number | null) {
  const { isDemoMode } = useDemoMode();

  return useSWR<CbTask[]>(
    studentId ? (isDemoMode ? `demo-tasks-${studentId}` : `tasks-${studentId}`) : null,
    async () => {
      if (!studentId) return [];
      if (isDemoMode) {
        return MOCK_TASKS.filter((t) => t.student_id === studentId);
      }
      return api.tasks.forStudent(studentId);
    },
    { dedupingInterval: isDemoMode ? 60000 : 3000, revalidateOnFocus: !isDemoMode }
  );
}

/** Complete a task */
export async function completeTask(taskId: number, studentId: number): Promise<CbTask> {
  if (isDemoModeActive()) {
    const task = MOCK_TASKS.find((t) => t.id === taskId);
    if (task) {
      task.status = 'complete';
      task.completed_at = new Date().toISOString();
    }
    mutate(`demo-tasks-${studentId}`);
    return task ?? ({} as CbTask);
  }
  const result = await api.tasks.update(taskId, { status: 'complete' });
  mutate(`tasks-${studentId}`);
  return result;
}

/** Create a new task */
export async function createTask(data: CreateTaskRequest, studentId: number): Promise<CbTask> {
  if (isDemoModeActive()) {
    const task: CbTask = {
      id: Date.now(),
      student_id: data.student_id ?? null,
      contact_id: data.contact_id ?? null,
      assigned_to: data.assigned_to,
      created_by: data.assigned_to,
      type: data.type,
      title: data.title,
      notes: data.notes ?? null,
      due_date: data.due_date ?? null,
      status: 'open',
      recurrence_rule: null,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    MOCK_TASKS.push(task);
    mutate(`demo-tasks-${studentId}`);
    return task;
  }
  const result = await api.tasks.create(data);
  mutate(`tasks-${studentId}`);
  return result;
}
