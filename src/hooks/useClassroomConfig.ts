import useSWR from 'swr';
import { api } from '@/lib/api';
import type { ClassroomSection } from '@/lib/types';

/** Default section colors keyed by lowercase name prefix */
const SECTION_COLORS: Record<string, string> = {
  early: 'var(--secondary)',
  main: 'var(--primary)',
  upper: 'var(--accent)',
};

function colorForSection(name: string): string {
  const lower = name.toLowerCase();
  for (const [prefix, color] of Object.entries(SECTION_COLORS)) {
    if (lower.includes(prefix)) return color;
  }
  return 'var(--primary)';
}

/**
 * Fetch the saved classroom config from the API and convert to the
 * ClassroomSection[] shape that Live Class components expect.
 */
export function useClassroomConfig() {
  return useSWR<ClassroomSection[]>(
    'classroom-config',
    async () => {
      const data = await api.classroomConfig.get();
      const { sections, rows } = data;

      return sections
        .sort((a, b) => a.order - b.order)
        .map((sec) => ({
          id: sec.id,
          name: sec.name,
          desc: '',
          color: colorForSection(sec.name),
          rows: rows
            .filter((r) => r.section_id === sec.id)
            .sort((a, b) => a.order - b.order)
            .map((r) => ({
              id: r.id,
              label: r.name,
              // 86ah46rd5: pass through the saved flat seat count verbatim.
              // The previous adapter rewrote this as
              //   { tables: Math.ceil(r.seats / 2), seatsPerTable: 2 }
              // which rounded any odd seat count up to the next even number
              // when consumers multiplied the two fields back together. The
              // canonical wire shape and the user-facing Setup screen both
              // use a flat seats: number.
              seats: r.seats,
              teacher: '',
              testing_seats: r.testing_seats ?? 0,
            })),
        }));
    },
    { dedupingInterval: 30000 }
  );
}
