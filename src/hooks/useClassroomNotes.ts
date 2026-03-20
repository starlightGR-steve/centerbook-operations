import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import { MOCK_CLASSROOM_NOTES } from '@/lib/mock-data';
import { useDemoMode, isDemoModeActive } from '@/context/MockDataContext';
import type { ClassroomNote, CreateClassroomNoteRequest } from '@/lib/types';

const swrKey = (studentId: number, demo?: boolean) =>
  demo ? `demo-classroom-notes-${studentId}` : `classroom-notes-${studentId}`;

/** Fetch classroom observation notes for a student */
export function useClassroomNotes(studentId: number | null) {
  const { isDemoMode } = useDemoMode();

  return useSWR<ClassroomNote[]>(
    studentId ? swrKey(studentId, isDemoMode) : null,
    async () => {
      if (!studentId) return [];
      if (isDemoMode) {
        return MOCK_CLASSROOM_NOTES.filter((n) => n.student_id === studentId);
      }
      return api.classroomNotes.forStudent(studentId);
    },
    { dedupingInterval: isDemoMode ? 60000 : 3000, revalidateOnFocus: !isDemoMode }
  );
}

/** Create a new classroom observation note */
export async function createClassroomNote(
  data: CreateClassroomNoteRequest
): Promise<ClassroomNote> {
  if (isDemoModeActive()) {
    const note: ClassroomNote = {
      id: Date.now(),
      student_id: data.student_id,
      note_text: data.note_text,
      author_id: data.author_id,
      author_name: 'Staff',
      needs_management_attention: data.needs_management_attention,
      created_at: new Date().toISOString(),
    };
    MOCK_CLASSROOM_NOTES.push(note);
    mutate(swrKey(data.student_id, true));
    return note;
  }
  const result = await api.classroomNotes.create(data);
  mutate(swrKey(data.student_id));
  return result;
}
