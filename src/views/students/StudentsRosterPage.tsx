'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronUp, ChevronDown, Plus } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';
import SearchInput from '@/components/ui/SearchInput';
import Badge from '@/components/ui/Badge';
import SubjectBadges from '@/components/SubjectBadges';
import PosBadge from '@/components/PosBadge';
import { useAllStudents } from '@/hooks/useStudents';
import { parseSubjects, parseScheduleDays, formatTimeKey } from '@/lib/types';
import type { Student } from '@/lib/types';
import styles from './StudentsRosterPage.module.css';

type SortKey =
  | 'name'
  | 'enroll_month'
  | 'enroll_date'
  | 'birth_month'
  | 'date_of_birth'
  | 'school'
  | 'enrollment_status'
  | 'current_level_math'
  | 'current_level_reading';

type SortDir = 'asc' | 'desc';

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getEnrollMonth(s: Student): number | null {
  if (s.enroll_month != null) return s.enroll_month;
  if (s.enroll_date) return new Date(s.enroll_date + 'T12:00:00').getMonth() + 1;
  return null;
}

function getBirthMonth(s: Student): number | null {
  if (s.birth_month != null) return s.birth_month;
  if (s.date_of_birth) return new Date(s.date_of_birth + 'T12:00:00').getMonth() + 1;
  return null;
}

function sortStudents(students: Student[], key: SortKey, dir: SortDir): Student[] {
  return [...students].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case 'name':
        cmp = `${a.last_name}, ${a.first_name}`.localeCompare(`${b.last_name}, ${b.first_name}`);
        break;
      case 'enroll_month':
        cmp = (getEnrollMonth(a) ?? 99) - (getEnrollMonth(b) ?? 99);
        break;
      case 'enroll_date':
        cmp = (a.enroll_date ?? '').localeCompare(b.enroll_date ?? '');
        break;
      case 'birth_month':
        cmp = (getBirthMonth(a) ?? 99) - (getBirthMonth(b) ?? 99);
        break;
      case 'date_of_birth':
        cmp = (a.date_of_birth ?? '').localeCompare(b.date_of_birth ?? '');
        break;
      case 'school':
        cmp = (a.school ?? '').localeCompare(b.school ?? '');
        break;
      case 'enrollment_status':
        cmp = a.enrollment_status.localeCompare(b.enrollment_status);
        break;
      case 'current_level_math':
        cmp = (a.current_level_math ?? '').localeCompare(b.current_level_math ?? '');
        break;
      case 'current_level_reading':
        cmp = (a.current_level_reading ?? '').localeCompare(b.current_level_reading ?? '');
        break;
    }
    return dir === 'asc' ? cmp : -cmp;
  });
}

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'Active': return 'success';
    case 'On Hold': return 'warning';
    case 'Withdrawn': return 'danger';
    default: return 'neutral';
  }
}

export default function StudentsRosterPage() {
  const router = useRouter();
  const { data: students, isLoading } = useAllStudents();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [posFilter, setPosFilter] = useState<string>('All');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    if (!students) return [];
    let result = students;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
          `${s.last_name}, ${s.first_name}`.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'All') {
      result = result.filter((s) => s.enrollment_status === statusFilter);
    }

    if (subjectFilter !== 'All') {
      result = result.filter((s) => {
        const subs = parseSubjects(s.subjects);
        if (subjectFilter === 'Math') return subs.includes('Math') && !subs.includes('Reading');
        if (subjectFilter === 'Reading') return subs.includes('Reading') && !subs.includes('Math');
        if (subjectFilter === 'Math + Reading') return subs.includes('Math') && subs.includes('Reading');
        return true;
      });
    }

    if (posFilter !== 'All') {
      result = result.filter((s) => s.classroom_position === posFilter);
    }

    return sortStudents(result, sortKey, sortDir);
  }, [students, search, statusFilter, subjectFilter, posFilter, sortKey, sortDir]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  const ThSort = ({ col, label }: { col: SortKey; label: string }) => (
    <th className={styles.th} onClick={() => handleSort(col)}>
      <span className={styles.thContent}>
        {label}
        <SortIcon col={col} />
      </span>
    </th>
  );

  const total = students?.length ?? 0;
  const showing = filtered.length;
  const countLabel = showing === total ? `${total} students` : `${showing} of ${total}`;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <SectionHeader
            script="Manage Your"
            title="Student Roster"
            subtitle={isLoading ? 'Loading...' : countLabel}
          />
          <button
            className={styles.newBtn}
            onClick={() => router.push('/students/new')}
          >
            <Plus size={14} /> New Student
          </button>
        </div>
        <div className={styles.toolbar}>
          <SearchInput
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.search}
          />
          <select
            className={styles.filter}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="On Hold">On Hold</option>
            <option value="Withdrawn">Withdrawn</option>
          </select>
          <select
            className={styles.filter}
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
          >
            <option value="All">All Subjects</option>
            <option value="Math">Math</option>
            <option value="Reading">Reading</option>
            <option value="Math + Reading">Math + Reading</option>
          </select>
          <select
            className={styles.filter}
            value={posFilter}
            onChange={(e) => setPosFilter(e.target.value)}
          >
            <option value="All">All Positions</option>
            <option value="Early Learners">Early Learners</option>
            <option value="Main Classroom">Main Classroom</option>
            <option value="Upper Classroom">Upper Classroom</option>
          </select>
        </div>
      </div>

      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.loading}>Loading students...</div>
        ) : filtered.length === 0 ? (
          <div className={styles.loading}>No students match your filters.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <ThSort col="name" label="Name" />
                  <ThSort col="enroll_month" label="Enroll Mo." />
                  <ThSort col="enroll_date" label="Enroll Date" />
                  <ThSort col="birth_month" label="Birth Mo." />
                  <ThSort col="date_of_birth" label="DOB" />
                  <ThSort col="school" label="School" />
                  <th className={styles.th}>Subjects</th>
                  <th className={styles.th}>Program</th>
                  <th className={styles.th}>Position</th>
                  <ThSort col="current_level_math" label="Math Lvl" />
                  <ThSort col="current_level_reading" label="Read Lvl" />
                  <th className={styles.th}>Schedule</th>
                  <ThSort col="enrollment_status" label="Status" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const enrollMo = getEnrollMonth(s);
                  const birthMo = getBirthMonth(s);
                  const days = parseScheduleDays(s.class_schedule_days);
                  return (
                    <tr
                      key={s.id}
                      className={`${styles.row} ${i % 2 === 0 ? styles.rowEven : styles.rowOdd}`}
                      onClick={() => router.push(`/students/${s.id}`)}
                    >
                      <td className={styles.cell}>
                        <span className={styles.name}>{s.last_name}, {s.first_name}</span>
                      </td>
                      <td className={`${styles.cell} ${styles.cellCenter}`}>
                        {enrollMo ? MONTH_NAMES[enrollMo] : '—'}
                      </td>
                      <td className={`${styles.cell} ${styles.cellCenter}`}>
                        {s.enroll_date ?? '—'}
                      </td>
                      <td className={`${styles.cell} ${styles.cellCenter}`}>
                        {birthMo ? MONTH_NAMES[birthMo] : '—'}
                      </td>
                      <td className={`${styles.cell} ${styles.cellCenter}`}>
                        {s.date_of_birth ?? '—'}
                      </td>
                      <td className={styles.cell}>
                        <span className={styles.schoolText}>{s.school ?? '—'}</span>
                      </td>
                      <td className={styles.cell}>
                        <SubjectBadges subjects={s.subjects} />
                      </td>
                      <td className={`${styles.cell} ${styles.cellCenter}`}>
                        {s.program_type ?? '—'}
                      </td>
                      <td className={styles.cell}>
                        {s.classroom_position ? <PosBadge position={s.classroom_position} /> : '—'}
                      </td>
                      <td className={`${styles.cell} ${styles.cellCenter}`}>
                        {s.current_level_math ? (
                          <Badge variant="math">{s.current_level_math}</Badge>
                        ) : '—'}
                      </td>
                      <td className={`${styles.cell} ${styles.cellCenter}`}>
                        {s.current_level_reading ? (
                          <Badge variant="reading">{s.current_level_reading}</Badge>
                        ) : '—'}
                      </td>
                      <td className={styles.cell}>
                        <div className={styles.dayPills}>
                          {days.map((d) => (
                            <span key={d} className={styles.dayPill}>{d.slice(0, 3)}</span>
                          ))}
                          {s.class_time_sort_key && (
                            <span className={styles.timePill}>{formatTimeKey(s.class_time_sort_key)}</span>
                          )}
                        </div>
                      </td>
                      <td className={styles.cell}>
                        <Badge variant={statusVariant(s.enrollment_status)}>
                          {s.enrollment_status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
