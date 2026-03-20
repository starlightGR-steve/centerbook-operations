import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import type { ClassroomNote, CreateClassroomNoteRequest } from '@/lib/types';

/** Fetch classroom observation notes for a student */
export function useClassroomNotes(studentId: number | null) {
  return useSWR<ClassroomNote[]>(
    studentId ? `classroom-notes-${studentId}` : null,
    async () => {
      if (!studentId) return [];
      return api.classroomNotes.forStudent(studentId);
    },
    { dedupingInterval: 3000, revalidateOnFocus: true }
  );
}

/** Create a new classroom observation note */
export async function createClassroomNote(
  data: CreateClassroomNoteRequest
): Promise<ClassroomNote> {
  const result = await api.classroomNotes.create(data);
  mutate(`classroom-notes-${data.student_id}`);
  return result;
}
