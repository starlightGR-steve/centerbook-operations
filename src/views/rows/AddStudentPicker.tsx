'use client';

import { useState, useMemo } from 'react';
import { Search, X, UserPlus } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import SubjectBadges from '@/components/SubjectBadges';
import type { Student } from '@/lib/types';
import styles from './AddStudentPicker.module.css';

interface AddStudentPickerProps {
  rowLabel: string;
  unassignedStudents: Student[];
  onAssign: (studentId: number) => void;
  onClose: () => void;
}

export default function AddStudentPicker({
  rowLabel,
  unassignedStudents,
  onAssign,
  onClose,
}: AddStudentPickerProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return unassignedStudents;
    const q = search.toLowerCase();
    return unassignedStudents.filter((s) => {
      const full = `${s.first_name} ${s.last_name}`.toLowerCase();
      return full.includes(q) || s.last_name.toLowerCase().includes(q);
    });
  }, [unassignedStudents, search]);

  return (
    <Modal
      open
      onClose={onClose}
      title={`Add to ${rowLabel}`}
      subtitle={`${unassignedStudents.length} unassigned student${unassignedStudents.length !== 1 ? 's' : ''}`}
      maxWidth="400px"
    >
      {unassignedStudents.length === 0 ? (
        <div className={styles.empty}>
          <UserPlus size={20} />
          <p>All checked-in students are assigned to rows</p>
        </div>
      ) : (
        <>
          {unassignedStudents.length > 10 && (
            <div className={styles.searchWrap}>
              <Search size={14} className={styles.searchIcon} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name..."
                className={styles.searchInput}
              />
              {search && (
                <button className={styles.clearBtn} onClick={() => setSearch('')}>
                  <X size={14} />
                </button>
              )}
            </div>
          )}
          <div className={styles.list}>
            {filtered.map((s) => (
              <button
                key={s.id}
                className={styles.item}
                onClick={() => onAssign(s.id)}
              >
                <span className={styles.name}>
                  {s.first_name} {s.last_name}
                </span>
                <SubjectBadges subjects={s.subjects} />
              </button>
            ))}
            {filtered.length === 0 && search && (
              <p className={styles.noResults}>No match for &ldquo;{search}&rdquo;</p>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
