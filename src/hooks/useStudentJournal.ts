import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import type { JournalEntry, CreateJournalEntryRequest, UpdateJournalEntryRequest } from '@/lib/types';

const swrKey = (studentId: number) => `journal-${studentId}`;

/** Fetch journal entries for a student */
export function useStudentJournal(studentId: number | null) {
  return useSWR<JournalEntry[]>(
    studentId ? swrKey(studentId) : null,
    async () => {
      if (!studentId) return [];
      return api.journal.forStudent(studentId);
    },
    { dedupingInterval: 3000 }
  );
}

/** Create a journal entry */
export async function createJournalEntry(data: CreateJournalEntryRequest): Promise<JournalEntry> {
  const result = await api.journal.create(data);
  mutate(swrKey(data.student_id));
  return result;
}

/** Update a journal entry */
export async function updateJournalEntry(
  id: number,
  studentId: number,
  data: UpdateJournalEntryRequest
): Promise<JournalEntry> {
  const result = await api.journal.update(id, data);
  mutate(swrKey(studentId));
  return result;
}

/** Delete a journal entry */
export async function deleteJournalEntry(
  id: number,
  studentId: number
): Promise<void> {
  await api.journal.delete(id);
  mutate(swrKey(studentId));
}
