import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import type { CbTask, CreateTaskRequest } from '@/lib/types';

/** Fetch open tasks for a student */
export function useStudentTasks(studentId: number | null) {
  return useSWR<CbTask[]>(
    studentId ? `tasks-${studentId}` : null,
    async () => {
      if (!studentId) return [];
      return api.tasks.forStudent(studentId);
    },
    { dedupingInterval: 3000 }
  );
}

/** Complete a task */
export async function completeTask(taskId: number, studentId: number): Promise<CbTask> {
  const result = await api.tasks.update(taskId, { status: 'complete' });
  mutate(`tasks-${studentId}`);
  return result;
}

/** Create a new task */
export async function createTask(data: CreateTaskRequest, studentId: number): Promise<CbTask> {
  const result = await api.tasks.create(data);
  mutate(`tasks-${studentId}`);
  return result;
}
