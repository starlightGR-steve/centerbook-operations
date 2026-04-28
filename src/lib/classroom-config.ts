import type { ClassroomSection } from './types';

/** Static classroom layout configuration — future: move to center settings API */
export const CLASSROOM_CONFIG: ClassroomSection[] = [
  {
    id: 'sec-el', name: 'Early Learners',
    desc: '1:2 teacher-to-student ratio',
    color: 'var(--secondary)',
    rows: [
      { id: 'el1', label: 'EL Row 1', seats: 2, teacher: 'Maria T.', ratio: '1:2' },
      { id: 'el2', label: 'EL Row 2', seats: 2, teacher: 'Lisa W.', ratio: '1:2' },
      { id: 'el3', label: 'EL Row 3', seats: 2, teacher: 'Tom H.', ratio: '1:2' },
    ],
  },
  {
    id: 'sec-main', name: 'Main Classroom',
    desc: 'Standard rows',
    color: 'var(--primary)',
    rows: [
      { id: 'm1', label: 'Row 1', seats: 10, teacher: 'Sarah K.' },
      { id: 'm2', label: 'Row 2', seats: 10, teacher: 'Jane D.' },
      { id: 'm3', label: 'Row 3', seats: 10, teacher: 'Mike R.' },
      { id: 'm4', label: 'Row 4', seats: 10, teacher: 'Leah M.' },
      { id: 'm5', label: 'Row 5', seats: 10, teacher: 'Chris P.' },
    ],
  },
  {
    id: 'sec-upper', name: 'Upper Classroom',
    desc: 'Advanced students — requires advanced math teacher',
    color: 'var(--accent)',
    rows: [
      { id: 'upper', label: 'Upper Row', seats: 10, teacher: 'Dr. Kim (Adv. Math)', advanced: true },
    ],
  },
];
