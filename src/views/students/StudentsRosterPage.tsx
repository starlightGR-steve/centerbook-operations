'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ChevronUp, ChevronDown, Plus } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';
import SearchInput from '@/components/ui/SearchInput';
import Badge from '@/components/ui/Badge';
import SubjectBadges from '@/components/SubjectBadges';
import PosBadge from '@/components/PosBadge';
import SMSConsentBadge from '@/components/ui/SMSConsentBadge';
import AmberInlineNote from '@/components/ui/AmberInlineNote';
import { useAllStudents } from '@/hooks/useStudents';
import { api } from '@/lib/api';
import { parseSubjects, parseScheduleDays, formatTimeKey } from '@/lib/types';
import type { Student, Contact, SmsConsentStatus } from '@/lib/types';
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
  | 'current_level_reading'
  | 'sms_status';

type SmsFilter = 'All' | SmsConsentStatus;

// Sort weight per status — drives the SMS STATUS column. Sorts by "needs
// attention first" so the outreach queue surfaces at the top: opted_out → 0,
// no_reply → 1, sms_on → 2.
const SMS_SORT_WEIGHT: Record<SmsConsentStatus, number> = {
  opted_out: 0,
  no_reply: 1,
  sms_on: 2,
};

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

function sortStudents(
  students: Student[],
  key: SortKey,
  dir: SortDir,
  smsByStudent?: Map<number, SmsConsentStatus>,
): Student[] {
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
      case 'sms_status': {
        const wa = SMS_SORT_WEIGHT[smsByStudent?.get(a.id) ?? 'no_reply'];
        const wb = SMS_SORT_WEIGHT[smsByStudent?.get(b.id) ?? 'no_reply'];
        cmp = wa - wb;
        break;
      }
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
  const [dayFilter, setDayFilter] = useState<string>('All');
  const [programFilter, setProgramFilter] = useState<string>('All');
  const [smsFilter, setSmsFilter] = useState<SmsFilter>('All');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Bulk /operations/students/all does not denormalize SMS consent today.
  // Fetch the contacts list once (single ~50-row payload, paginated under
  // 200) and join client-side. Shares the SWR key with ContactsPage so the
  // cache is single-source. Alt-parent hint compares primary vs billing.
  const { data: contacts } = useSWR<Contact[]>(
    'contacts',
    () => api.contacts.list(),
    { dedupingInterval: 30000, revalidateOnFocus: false },
  );

  const contactById = useMemo(() => {
    const m = new Map<number, Contact>();
    (contacts ?? []).forEach((c) => m.set(c.id, c));
    return m;
  }, [contacts]);

  // Per-student primary consent — used for column display, filter, and sort.
  const smsByStudent = useMemo(() => {
    const m = new Map<number, SmsConsentStatus>();
    (students ?? []).forEach((s) => {
      // Prefer the denormalized field on the row when present (single-student
      // GET ships it). Fall back to the contacts join for the bulk endpoint.
      const fromRow = (s as Student & { primary_contact_sms_consent_status?: SmsConsentStatus })
        .primary_contact_sms_consent_status;
      if (fromRow) {
        m.set(s.id, fromRow);
        return;
      }
      const c = s.primary_contact_id ? contactById.get(s.primary_contact_id) : undefined;
      m.set(s.id, (c?.sms_consent_status as SmsConsentStatus | undefined) ?? 'no_reply');
    });
    return m;
  }, [students, contactById]);

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
        if (subjectFilter === 'Math') return subs.includes('Math');
        if (subjectFilter === 'Reading') return subs.includes('Reading');
        if (subjectFilter === 'Math + Reading') return subs.includes('Math') && subs.includes('Reading');
        return true;
      });
    }

    if (posFilter !== 'All') {
      result = result.filter((s) => s.classroom_position === posFilter);
    }

    if (dayFilter !== 'All') {
      result = result.filter((s) => {
        const days = s.class_schedule_days?.split(',').map((d) => d.trim()) || [];
        const detailDays = s.schedule_detail ? Object.keys(s.schedule_detail) : [];
        return days.includes(dayFilter) || detailDays.includes(dayFilter);
      });
    }

    if (programFilter !== 'All') {
      result = result.filter((s) => s.program_type === programFilter);
    }

    if (smsFilter !== 'All') {
      result = result.filter((s) => (smsByStudent.get(s.id) ?? 'no_reply') === smsFilter);
    }

    return sortStudents(result, sortKey, sortDir, smsByStudent);
  }, [students, search, statusFilter, subjectFilter, posFilter, dayFilter, programFilter, smsFilter, sortKey, sortDir, smsByStudent]);

  // Count of students in the currently-selected SMS filter (for the
  // dropdown's count pill per PDF section 9). When 'All' is selected, the
  // pill shows nothing — the filter is inactive.
  const smsFilterCount = useMemo(() => {
    if (smsFilter === 'All') return null;
    return (students ?? []).filter((s) => (smsByStudent.get(s.id) ?? 'no_reply') === smsFilter).length;
  }, [students, smsByStudent, smsFilter]);

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
  const countLabel = showing === total ? `${total} students` : `Showing ${showing} of ${total} students`;

  const activeFilterCount = [statusFilter, subjectFilter, posFilter, dayFilter, programFilter, smsFilter].filter((f) => f !== 'All').length;
  const clearAllFilters = () => {
    setStatusFilter('All');
    setSubjectFilter('All');
    setPosFilter('All');
    setDayFilter('All');
    setProgramFilter('All');
    setSmsFilter('All');
  };

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
            className={`${styles.filter} ${statusFilter !== 'All' ? styles.filterActive : ''}`}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="On Hold">On Hold</option>
            <option value="Withdrawn">Withdrawn</option>
          </select>
          <select
            className={`${styles.filter} ${subjectFilter !== 'All' ? styles.filterActive : ''}`}
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
          >
            <option value="All">All Subjects</option>
            <option value="Math">Math</option>
            <option value="Reading">Reading</option>
            <option value="Math + Reading">Math + Reading</option>
          </select>
          <select
            className={`${styles.filter} ${posFilter !== 'All' ? styles.filterActive : ''}`}
            value={posFilter}
            onChange={(e) => setPosFilter(e.target.value)}
          >
            <option value="All">All Positions</option>
            <option value="Early Learners">Early Learners</option>
            <option value="Main Classroom">Main Classroom</option>
            <option value="Upper Classroom">Upper Classroom</option>
          </select>
          <select
            className={`${styles.filter} ${dayFilter !== 'All' ? styles.filterActive : ''}`}
            value={dayFilter}
            onChange={(e) => setDayFilter(e.target.value)}
          >
            <option value="All">All Days</option>
            <option value="Monday">Monday</option>
            <option value="Tuesday">Tuesday</option>
            <option value="Wednesday">Wednesday</option>
            <option value="Thursday">Thursday</option>
            <option value="Friday">Friday</option>
          </select>
          <select
            className={`${styles.filter} ${programFilter !== 'All' ? styles.filterActive : ''}`}
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
          >
            <option value="All">All Programs</option>
            <option value="Paper">Paper</option>
            <option value="Kumon Connect">Kumon Connect</option>
          </select>
          {/* SMS status filter (PDF section 9). Custom wrapper so we can
              render the count pill next to the active option. */}
          <span className={styles.smsFilterWrap}>
            <span className={styles.smsFilterLabel}>SMS status:</span>
            <select
              className={`${styles.filter} ${smsFilter !== 'All' ? styles.filterActive : ''}`}
              value={smsFilter}
              onChange={(e) => setSmsFilter(e.target.value as SmsFilter)}
            >
              <option value="All">All</option>
              <option value="sms_on">SMS on</option>
              <option value="opted_out">Opted out</option>
              <option value="no_reply">No reply</option>
            </select>
            {smsFilterCount !== null && (
              <span className={styles.smsFilterCount}>{smsFilterCount}</span>
            )}
          </span>
          {activeFilterCount > 0 && (
            <button className={styles.clearFilters} onClick={clearAllFilters}>
              {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} — Clear all
            </button>
          )}
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
                  <ThSort col="sms_status" label="SMS status" />
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
                      <td className={styles.cell}>
                        {(() => {
                          // PDF section 9: medium SMS badge for the primary
                          // comm parent. Alt-parent hint (amber dot + text)
                          // appears below when primary is opted_out/no_reply
                          // AND billing is sms_on. The bulk students endpoint
                          // exposes only primary + billing contact ids today,
                          // so the hint is constrained to that pair.
                          const primary = smsByStudent.get(s.id) ?? 'no_reply';
                          const billingContact = s.billing_contact_id && s.billing_contact_id !== s.primary_contact_id
                            ? contactById.get(s.billing_contact_id)
                            : undefined;
                          const billingStatus = billingContact?.sms_consent_status as SmsConsentStatus | undefined;
                          const showAltHint =
                            (primary === 'opted_out' || primary === 'no_reply') &&
                            billingStatus === 'sms_on' &&
                            !!billingContact;
                          return (
                            <div className={styles.smsCell}>
                              <SMSConsentBadge status={primary} size="medium" />
                              {showAltHint && billingContact && (
                                <AmberInlineNote className={styles.smsAltHint}>
                                  {billingContact.first_name} (billing) is SMS on
                                </AmberInlineNote>
                              )}
                            </div>
                          );
                        })()}
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
