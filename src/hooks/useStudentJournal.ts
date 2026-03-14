import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import { MOCK_JOURNAL_ENTRIES } from '@/lib/mock-data';
import { useDemoMode, isDemoModeActive } from '@/context/MockDataContext';
import type { JournalEntry, CreateJournalEntryRequest } from '@/lib/types';

/** Fetch journal entries for a student */
export function useStudentJournal(studentId: number | null) {
  const { isDemoMode } = useDemoMode();

  return useSWR<JournalEntry[]>(
    studentId ? (isDemoMode ? `demo-journal-${studentId}` : `journal-${studentId}`) : null,
    async () => {
      if (!studentId) return [];
      if (isDemoMode) {
        return MOCK_JOURNAL_ENTRIES.filter((e) => e.student_id === studentId);
      }
      return api.journal.forStudent(studentId);
    },
    { dedupingInterval: isDemoMode ? 60000 : 3000, revalidateOnFocus: !isDemoMode }
  );
}

/** Create a journal entry */
export async function createJournalEntry(data: CreateJournalEntryRequest): Promise<JournalEntry> {
  if (isDemoModeActive()) {
    const entry: JournalEntry = {
      id: Date.now(),
      student_id: data.student_id,
      created_by: 1,
      entry_type: data.entry_type,
      visibility: data.visibility,
      title: data.title ?? null,
      content: data.content,
      goal_status: null,
      task_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    MOCK_JOURNAL_ENTRIES.push(entry);
    mutate(`demo-journal-${data.student_id}`);
    return entry;
  }
  const result = await api.journal.create(data);
  mutate(`journal-${data.student_id}`);
  return result;
}
