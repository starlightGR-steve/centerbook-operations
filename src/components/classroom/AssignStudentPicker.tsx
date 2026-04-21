'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { X, Search } from 'lucide-react';
import useSWR from 'swr';
import { useActiveAttendance } from '@/hooks/useAttendance';
import { useStudents } from '@/hooks/useStudents';
import { useClassroomAssignments } from '@/hooks/useRows';
import { getCenterToday } from '@/lib/dates';
import type { Student } from '@/lib/types';
import styles from './AssignStudentPicker.module.css';

// Keep useSWR referenced so tree-shakers don't drop SWR's provider context that
// our dependency hooks rely on.
void useSWR;

interface AssignStudentPickerProps {
  isOpen: boolean;
  rowLabel: string;
  onSelect: (student: Student) => Promise<void>;
  onClose: () => void;
}

type SectionKey = 'el' | 'mc' | 'uc';

const SECTIONS: Array<{
  key: SectionKey;
  label: string;
  position: NonNullable<Student['classroom_position']>;
  tag: string;
}> = [
  { key: 'el', label: 'Early Learners', position: 'Early Learners', tag: 'EL' },
  { key: 'mc', label: 'Main Classroom', position: 'Main Classroom', tag: 'MC' },
  { key: 'uc', label: 'Upper Classroom', position: 'Upper Classroom', tag: 'UC' },
];

function todayStr(): string {
  return getCenterToday();
}

function sectionKeyFor(pos: Student['classroom_position']): SectionKey | null {
  if (pos === 'Early Learners') return 'el';
  if (pos === 'Main Classroom') return 'mc';
  if (pos === 'Upper Classroom') return 'uc';
  return null;
}

export default function AssignStudentPicker({
  isOpen,
  rowLabel,
  onSelect,
  onClose,
}: AssignStudentPickerProps) {
  const { data: activeAttendance } = useActiveAttendance();
  const { data: allStudents } = useStudents();
  const { data: rowAssignments } = useClassroomAssignments(todayStr());

  const [search, setSearch] = useState('');
  const [focusIdx, setFocusIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const studentsById = useMemo(() => {
    const map = new Map<number, Student>();
    (allStudents ?? []).forEach((s) => map.set(s.id, s));
    return map;
  }, [allStudents]);

  const assignedIds = useMemo(() => {
    return new Set<number>((rowAssignments ?? []).map((a) => a.student_id));
  }, [rowAssignments]);

  // Checked-in today AND not already row-assigned AND not Withdrawn/Inactive.
  const available = useMemo<Student[]>(() => {
    if (!activeAttendance) return [];
    const out: Student[] = [];
    for (const att of activeAttendance) {
      const s = studentsById.get(att.student_id);
      if (!s) continue;
      if (assignedIds.has(s.id)) continue;
      if (s.enrollment_status === 'Withdrawn' || s.enrollment_status === 'Inactive') continue;
      out.push(s);
    }
    return out;
  }, [activeAttendance, studentsById, assignedIds]);

  // Search filter across display name.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return available;
    return available.filter((s) => `${s.first_name} ${s.last_name}`.toLowerCase().includes(q));
  }, [available, search]);

  // Group by section, alpha within each.
  const grouped = useMemo(() => {
    const g: Record<SectionKey, Student[]> = { el: [], mc: [], uc: [] };
    filtered.forEach((s) => {
      const key = sectionKeyFor(s.classroom_position);
      if (key) g[key].push(s);
    });
    (Object.keys(g) as SectionKey[]).forEach((k) => {
      g[k].sort((a, b) =>
        `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
      );
    });
    return g;
  }, [filtered]);

  // Flat ordered list (for keyboard nav), matches render order EL -> MC -> UC.
  const flatOrdered = useMemo(
    () => [...grouped.el, ...grouped.mc, ...grouped.uc],
    [grouped]
  );

  // Reset transient state when the picker opens.
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setFocusIdx(0);
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Clamp focus index when list changes.
  useEffect(() => {
    setFocusIdx((i) => {
      if (flatOrdered.length === 0) return 0;
      return Math.min(i, flatOrdered.length - 1);
    });
  }, [flatOrdered.length]);

  const handleSelect = useCallback(
    async (s: Student) => {
      try {
        await onSelect(s);
      } catch (err) {
        console.error('AssignStudentPicker: onSelect failed', err);
      }
    },
    [onSelect]
  );

  // Click-outside to close.
  useEffect(() => {
    if (!isOpen) return;
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  // Keyboard navigation.
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusIdx((i) => Math.min(i + 1, Math.max(0, flatOrdered.length - 1)));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        const target = flatOrdered[focusIdx];
        if (target) {
          e.preventDefault();
          void handleSelect(target);
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, flatOrdered, focusIdx, handleSelect, onClose]);

  if (!isOpen) return null;

  const sectionsToRender = SECTIONS.filter((sec) => grouped[sec.key].length > 0);
  const hasResults = flatOrdered.length > 0;
  const isSearching = search.trim().length > 0;

  return (
    <div className={styles.backdrop}>
      <div
        className={styles.panel}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Assign Student to ${rowLabel}`}
      >
        <header className={styles.header}>
          <h2 className={styles.title}>Assign Student</h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={22} aria-hidden="true" />
          </button>
        </header>

        <div className={styles.searchRow}>
          <Search size={18} className={styles.searchIcon} aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            className={styles.searchInput}
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search students"
          />
        </div>

        <div className={styles.body}>
          {!hasResults && isSearching && (
            <div className={styles.empty}>
              <p className={styles.emptyPrimary}>No students match</p>
              <p className={styles.emptyHint}>Clear the search to see all students</p>
            </div>
          )}
          {!hasResults && !isSearching && (
            <div className={styles.empty}>
              <p className={styles.emptyPrimary}>No available students</p>
              <p className={styles.emptyHint}>
                All checked-in students are already assigned to a row
              </p>
            </div>
          )}

          {sectionsToRender.map((sec) => {
            const arr = grouped[sec.key];
            return (
              <section key={sec.key} className={styles.section}>
                <div className={styles.sectionHeader}>
                  <span
                    className={`${styles.sectionDot} ${styles[`dot_${sec.key}`]}`}
                    aria-hidden="true"
                  />
                  <span className={styles.sectionLabel}>{sec.label}</span>
                  <span className={styles.sectionCount}>{arr.length}</span>
                </div>
                {arr.map((s) => {
                  const flatIdx = flatOrdered.indexOf(s);
                  const isFocused = flatIdx === focusIdx;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={`${styles.row} ${isFocused ? styles.rowFocused : ''}`}
                      onClick={() => void handleSelect(s)}
                      onMouseEnter={() => setFocusIdx(flatIdx)}
                    >
                      <span className={styles.name}>
                        {s.first_name} {s.last_name}
                      </span>
                      <span className={`${styles.tag} ${styles[`tag_${sec.key}`]}`}>
                        {sec.tag}
                      </span>
                    </button>
                  );
                })}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
