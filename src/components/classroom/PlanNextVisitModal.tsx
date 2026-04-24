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
  /** Header title. Defaults to "Plan Next Visit" for Student Record context;
   *  6c Detail Panel context passes "Add classroom item". */
  title?: string;
}

/** Maps configured flag keys to FlagChip types. Unknown keys fall back to null (filtered out). */
function flagKeyToType(key: string): FlagChipType | null {
  switch (key) {
    case 'new_concept': return 'new_concept';
    case 'needs_help': return 'needs_help';
    case 'work_with_amy': return 'work_amy';
    case 'needs_homework': return 'needs_homework';
    default: return null;
  }
}

const CUSTOM_PREFIX = 'custom:';

export default function PlanNextVisitModal({
  student,
  isOpen,
  onClose,
  onSave,
  title = 'Plan Next Visit',
}: PlanNextVisitModalProps) {
  const titleId = useId();
  const containerRef = useFocusTrap(isOpen, onClose);
  const { flags: flagConfig } = useFlagConfig();
  const { items: checklistConfig } = useChecklistConfig();

  const [selectedFlags, setSelectedFlags] = useState<Set<string>>(new Set());
  const [testing, setTesting] = useState<TestingState>({});
  const [selectedChecklist, setSelectedChecklist] = useState<Set<string>>(new Set());
  const [customTask, setCustomTask] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Synthesize a RowAssignmentFlags-shaped object so TestingSetupSection can read
  // the current testing selection via its existing `currentFlags.taking_test` path.
  const syntheticFlags: RowAssignmentFlags = useMemo(
    () => ({ taking_test: testing }),
    [testing]
  );

  // Defensively exclude taking_test from the flag list per Row View FINAL spec
  // section 1 note: "Taking Test is not a flag chip." Testing selection lives
  // exclusively in the Testing section below.
  const planFlagOptions = useMemo(
    () =>
      flagConfig
        .filter((fc) => fc.key !== 'taking_test')
        .filter((fc) => flagKeyToType(fc.key) !== null)
        .map((fc) => ({ key: fc.key, label: fc.label, type: flagKeyToType(fc.key)! })),
    [flagConfig]
  );

  // Custom checklist items are stored in selectedChecklist with a "custom:" prefix.
  // Display them below the center-configured items so Amy can see what's been added.
  const customChecklistKeys = useMemo(
    () => Array.from(selectedChecklist).filter((k) => k.startsWith(CUSTOM_PREFIX)),
    [selectedChecklist]
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

  const addCustomTask = () => {
    const trimmed = customTask.trim();
    if (!trimmed) return;
    const customKey = `${CUSTOM_PREFIX}${trimmed}`;
    setSelectedChecklist((prev) => {
      const next = new Set(prev);
      next.add(customKey);
      return next;
    });
    setCustomTask('');
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
      setCustomTask('');
      setNote('');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={styles.planModalFrame}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        className={styles.planModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className={styles.planModalHeader}>
          <span id={titleId} className={styles.title}>{title}</span>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        <div>
          <div className={styles.detailSectionTitle}>Class prep flags</div>
          <div className={styles.flagStack}>
            {planFlagOptions.map((opt) => (
              <FlagChip
                key={opt.key}
                mode="selection"
                type={opt.type}
                label={opt.label}
                selected={selectedFlags.has(opt.key)}
                onToggle={() => toggleFlag(opt.key)}
              />
            ))}
          </div>
        </div>

        <div>
          <div className={styles.detailSectionTitle}>Testing (next visit)</div>
          <TestingSetupSection
            student={student}
            currentFlags={syntheticFlags}
            onChange={setTesting}
            tense="future"
            hideTitle
            sectionLabel="Testing (next visit)"
          />
        </div>

        <div>
          <div className={styles.detailSectionTitle}>Teacher checklist</div>
          <div className={styles.checklistStack}>
            {checklistConfig.map((ci) => (
              <ChecklistItem
                key={ci.key}
                mode="selection"
                itemKey={ci.key}
                label={ci.label}
                selected={selectedChecklist.has(ci.key)}
                onToggle={() => toggleChecklist(ci.key)}
              />
            ))}
            {customChecklistKeys.map((key) => (
              <ChecklistItem
                key={key}
                mode="selection"
                itemKey={key}
                label={key.slice(CUSTOM_PREFIX.length)}
                selected
                onToggle={() => toggleChecklist(key)}
              />
            ))}
          </div>
          <div className={styles.customAddRow}>
            <input
              className={styles.customAddInput}
              placeholder="Custom task..."
              value={customTask}
              onChange={(e) => setCustomTask(e.target.value)}
              aria-label="Custom task"
            />
            <button
              type="button"
              className={styles.addBtn}
              onClick={addCustomTask}
            >
              Add
            </button>
          </div>
        </div>

        <div>
          <div className={styles.detailSectionTitle}>Note for teacher</div>
          <textarea
            className={styles.noteInput}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note for the classroom teacher..."
            aria-label="Note for the classroom teacher"
            rows={3}
          />
        </div>

        <button
          type="button"
          className={styles.savePlanBtn}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Plan'}
        </button>
      </div>
    </div>
  );
}
