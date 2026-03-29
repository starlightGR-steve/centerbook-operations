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
      console.log('CLASSROOM CONFIG: raw API data =', JSON.stringify(data));
      const { sections, rows } = data;

      const result = sections
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
              tables: Math.ceil(r.seats / 2),
              seatsPerTable: 2,
              teacher: '',
              testing_seats: r.testing_seats ?? 0,
            })),
        }));
      console.log('CLASSROOM CONFIG: transformed sections =', JSON.stringify(result));
      return result;
    },
    { dedupingInterval: 30000 }
  );
}
