import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import { MOCK_JOURNAL_ENTRIES } from '@/lib/mock-data';
import { useDemoMode, isDemoModeActive } from '@/context/MockDataContext';
import type { JournalEntry, CreateJournalEntryRequest, UpdateJournalEntryRequest } from '@/lib/types';

const swrKey = (studentId: number, demo?: boolean) =>
  demo ? `demo-journal-${studentId}` : `journal-${studentId}`;

/** Fetch journal entries for a student */
export function useStudentJournal(studentId: number | null) {
  const { isDemoMode } = useDemoMode();

  return useSWR<JournalEntry[]>(
    studentId ? swrKey(studentId, isDemoMode) : null,
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
      created_by: data.author_id,
      entry_type: data.entry_type,
      visibility: 'staff',
      title: data.title ?? null,
      content: data.content ?? '',
      metadata: data.metadata ?? null,
      author_id: data.author_id,
      author_name: 'Staff',
      goal_status: null,
      task_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    MOCK_JOURNAL_ENTRIES.push(entry);
    mutate(swrKey(data.student_id, true));
    return entry;
  }
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
  if (isDemoModeActive()) {
    const idx = MOCK_JOURNAL_ENTRIES.findIndex((e) => e.id === id);
    if (idx >= 0) Object.assign(MOCK_JOURNAL_ENTRIES[idx], data, { updated_at: new Date().toISOString() });
    mutate(swrKey(studentId, true));
    return MOCK_JOURNAL_ENTRIES[idx] ?? ({} as JournalEntry);
  }
  const result = await api.journal.update(id, data);
  mutate(swrKey(studentId));
  return result;
}

/** Delete a journal entry */
export async function deleteJournalEntry(
  id: number,
  studentId: number
): Promise<void> {
  if (isDemoModeActive()) {
    const idx = MOCK_JOURNAL_ENTRIES.findIndex((e) => e.id === id);
    if (idx >= 0) MOCK_JOURNAL_ENTRIES.splice(idx, 1);
    mutate(swrKey(studentId, true));
    return;
  }
  await api.journal.delete(id);
  mutate(swrKey(studentId));
}
