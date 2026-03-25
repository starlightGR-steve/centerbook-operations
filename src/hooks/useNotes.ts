import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import type { StudentNote, CreateNoteRequest } from '@/lib/types';

/** Fetch notes for a student, optionally filtered by date */
export function useNotes(studentId: number | null, date?: string) {
  return useSWR<StudentNote[]>(
    studentId ? `notes-${studentId}${date ? `-${date}` : ''}` : null,
    async () => {
      if (!studentId) return [];
      return api.notes.forStudent(studentId, date);
    },
    { dedupingInterval: 3000 }
  );
}

/** Create a new note */
export async function createNote(data: CreateNoteRequest): Promise<StudentNote> {
  const result = await api.notes.create(data);
  mutate(`notes-${data.student_id}`);
  mutate(`notes-${data.student_id}-${data.note_date}`);
  return result;
}

/** Delete a note */
export async function deleteNote(
  noteId: number,
  studentId: number
): Promise<void> {
  await api.notes.delete(noteId);
  mutate(`notes-${studentId}`);
}
