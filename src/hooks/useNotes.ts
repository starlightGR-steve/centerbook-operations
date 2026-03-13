import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import { MOCK_NOTES } from '@/lib/mock-data';
import { useDemoMode, isDemoModeActive } from '@/context/MockDataContext';
import type { StudentNote, CreateNoteRequest } from '@/lib/types';

/** Fetch notes for a student, optionally filtered by date */
export function useNotes(studentId: number | null, date?: string) {
  const { isDemoMode } = useDemoMode();

  return useSWR<StudentNote[]>(
    studentId ? (isDemoMode ? `demo-notes-${studentId}${date ? `-${date}` : ''}` : `notes-${studentId}${date ? `-${date}` : ''}`) : null,
    async () => {
      if (!studentId) return [];
      if (isDemoMode) {
        let notes = MOCK_NOTES.filter((n) => n.student_id === studentId);
        if (date) notes = notes.filter((n) => n.note_date === date);
        return notes;
      }
      return api.notes.forStudent(studentId, date);
    },
    { dedupingInterval: isDemoMode ? 60000 : 3000, revalidateOnFocus: !isDemoMode }
  );
}

/** Create a new note */
export async function createNote(data: CreateNoteRequest): Promise<StudentNote> {
  if (isDemoModeActive()) {
    mutate(`demo-notes-${data.student_id}`);
    mutate(`demo-notes-${data.student_id}-${data.note_date}`);
    return { id: Date.now(), student_id: data.student_id, author_type: data.author_type, author_name: data.author_name, author_id: data.author_id || null, content: data.content, note_date: data.note_date, visibility: data.visibility || 'internal', created_at: new Date().toISOString() };
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
  if (isDemoModeActive()) {
    mutate(`demo-notes-${studentId}`);
    return;
  }
  await api.notes.delete(noteId);
  mutate(`notes-${studentId}`);
}
