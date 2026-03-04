import useSWR, { mutate } from 'swr';
import { api, USE_MOCK } from '@/lib/api';
import { MOCK_NOTES } from '@/lib/mock-data';
import type { StudentNote, CreateNoteRequest } from '@/lib/types';

/** Fetch notes for a student, optionally filtered by date */
export function useNotes(studentId: number | null, date?: string) {
  return useSWR<StudentNote[]>(
    studentId ? `notes-${studentId}${date ? `-${date}` : ''}` : null,
    async () => {
      if (!studentId) return [];
      if (USE_MOCK) {
        let notes = MOCK_NOTES.filter((n) => n.student_id === studentId);
        if (date) notes = notes.filter((n) => n.note_date === date);
        return notes.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      return api.notes.forStudent(studentId, date);
    },
    { dedupingInterval: 3000 }
  );
}

/** Create a new note */
export async function createNote(data: CreateNoteRequest): Promise<StudentNote> {
  if (USE_MOCK) {
    const note: StudentNote = {
      id: Date.now(),
      student_id: data.student_id,
      author_type: data.author_type,
      author_name: data.author_name,
      author_id: data.author_id ?? null,
      content: data.content,
      note_date: data.note_date,
      visibility: data.visibility ?? 'staff',
      created_at: new Date().toISOString(),
    };
    mutate(`notes-${data.student_id}`);
    mutate(`notes-${data.student_id}-${data.note_date}`);
    return note;
  }
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
  if (USE_MOCK) {
    mutate(`notes-${studentId}`);
    return;
  }
  await api.notes.delete(noteId);
  mutate(`notes-${studentId}`);
}
