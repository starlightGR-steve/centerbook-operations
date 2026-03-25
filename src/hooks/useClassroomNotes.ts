import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import type { ClassroomNote, CreateClassroomNoteRequest } from '@/lib/types';

const swrKey = (studentId: number) => `classroom-notes-${studentId}`;

/** Fetch classroom observation notes for a student */
export function useClassroomNotes(studentId: number | null) {
  return useSWR<ClassroomNote[]>(
    studentId ? swrKey(studentId) : null,
    async () => {
      if (!studentId) return [];
      return api.classroomNotes.forStudent(studentId);
    },
    { dedupingInterval: 3000 }
  );
}

/** Create a new classroom observation note */
export async function createClassroomNote(
  data: CreateClassroomNoteRequest
): Promise<ClassroomNote> {
  const result = await api.classroomNotes.create(data);
  mutate(swrKey(data.student_id));
  return result;
}
