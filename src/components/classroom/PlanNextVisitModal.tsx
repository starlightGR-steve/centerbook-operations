'use client';

import { useState, useId, useMemo } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useFlagConfig, useChecklistConfig } from '@/hooks/useFlagConfig';
import type { Student, RowAssignmentFlags } from '@/lib/types';
import FlagChip, { type FlagChipType } from './FlagChip';
import ChecklistItem from './ChecklistItem';
import TestingSetupSection, { type TestingState } from './TestingSetupSection';
import styles from './PlanNextVisitModal.module.css';

export interface VisitPlanDraft {
  flags: string[];
  testing: TestingState;
  checklist: string[];
  note: string;
}

export interface PlanNextVisitModalProps {
  student: Student;
  isOpen: boolean;
  onClose: () => void;
  onSave: (plan: VisitPlanDraft) => Promise<void>;
}

/** Maps configured flag keys to FlagChip types. Unknown keys fall back to neutral. */
function flagKeyToType(key: string): FlagChipType | null {
  switch (key) {
    case 'new_concept': return 'new_concept';
    case 'needs_help': return 'needs_help';
    case 'work_with_amy': return 'work_amy';
    case 'needs_homework': return 'needs_homework';
    default: return null;
  }
}

export default function PlanNextVisitModal({
  student,
  isOpen,
  onClose,
  onSave,
}: PlanNextVisitModalProps) {
  const titleId = useId();
  const containerRef = useFocusTrap(isOpen, onClose);
  const { flags: flagConfig } = useFlagConfig();
  const { items: checklistConfig } = useChecklistConfig();

  const [selectedFlags, setSelectedFlags] = useState<Set<string>>(new Set());
  const [testing, setTesting] = useState<TestingState>({});
  const [selectedChecklist, setSelectedChecklist] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Build a synthetic flags object so TestingSetupSection sees current selection
  const syntheticFlags: RowAssignmentFlags = useMemo(
    () => ({ taking_test: testing }),
    [testing]
  );

  const planFlagOptions = useMemo(
    () =>
      flagConfig
        .filter((fc) => flagKeyToType(fc.key) !== null)
        .map((fc) => ({ key: fc.key, label: fc.label, type: flagKeyToType(fc.key)! })),
    [flagConfig]
  );

  const toggleFlag = (key: string) => {
    setSelectedFlags((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleChecklist = (key: string) => {
    setSelectedChecklist((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave({
        flags: Array.from(selectedFlags),
        testing,
        checklist: Array.from(selectedChecklist),
        note: note.trim(),
      });
      // Reset form
      setSelectedFlags(new Set());
      setTesting({});
      setSelectedChecklist(new Set());
      setNote('');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className={styles.header}>
          <h3 id={titleId} className={styles.title}>Plan Next Visit</h3>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={22} aria-hidden="true" />
          </button>
        </header>

        <div className={styles.body}>
          <p className={styles.studentName}>
            {student.first_name} {student.last_name}
          </p>

          <section className={styles.section}>
            <h4 className={styles.sectionLabel}>CLASS PREP FLAGS</h4>
            <div className={styles.flagWrap}>
              {planFlagOptions.map((opt) => (
                <FlagChip
                  key={opt.key}
                  type={opt.type}
                  label={opt.label}
                  done={!selectedFlags.has(opt.key)}
                  onToggle={() => toggleFlag(opt.key)}
                />
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <TestingSetupSection
              student={student}
              currentFlags={syntheticFlags}
              sectionLabel="Will take test"
              onChange={setTesting}
            />
          </section>

          <section className={styles.section}>
            <h4 className={styles.sectionLabel}>TEACHER CHECKLIST</h4>
            <div className={styles.checklistWrap}>
              {checklistConfig.map((ci) => (
                <ChecklistItem
                  key={ci.key}
                  itemKey={ci.key}
                  label={ci.label}
                  done={!selectedChecklist.has(ci.key)}
                  onToggle={() => toggleChecklist(ci.key)}
                />
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h4 className={styles.sectionLabel}>NOTE FOR TEACHER</h4>
            <textarea
              className={styles.noteInput}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note for the teacher..."
              rows={3}
            />
          </section>

          <button
            type="button"
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}
