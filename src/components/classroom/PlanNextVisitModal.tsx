'use client';

import { useState, useId, useMemo, useEffect } from 'react';
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
  /** Testing section tense. Defaults to "future" for the Plan Next Visit flow
   *  (section header "Testing (next visit)", toggle labels "Will take X test").
   *  6c Detail Panel passes "present" (header "Testing", toggle labels
   *  "Taking X test today"). Section title and toggle copy always covary. */
  testingTense?: 'future' | 'present';
  /** 86ah3f3xp Finding 4: when supplied, the modal initializes its
   *  selections (flags, testing state, checklist, note) from the student's
   *  current row-assignment flags so the user is editing existing state
   *  instead of starting blank. Plan Next Visit (Student Record) leaves
   *  this undefined for the legacy "from-scratch" behavior. */
  currentFlags?: RowAssignmentFlags | null;
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
  testingTense = 'future',
  currentFlags,
}: PlanNextVisitModalProps) {
  const testingTitle = testingTense === 'present' ? 'Testing' : 'Testing (next visit)';
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

  // 86ah3f3xp Finding 4: when the modal opens, prime selections from the
  // student's current row-assignment flags. Without this seed the form opened
  // blank and the user had to re-pick everything to make a change. Open=>true
  // transition is the trigger; while open, edits are tracked locally and
  // applied on Save (callers handle the merge semantics — currently add-only
  // for the Detail Panel "Add classroom item" call site).
  useEffect(() => {
    if (!isOpen) return;
    if (!currentFlags) {
      setSelectedFlags(new Set());
      setTesting({});
      setSelectedChecklist(new Set());
      setCustomTask('');
      setNote('');
      return;
    }
    const blob = currentFlags as Record<string, unknown>;
    // Flags: only those configured in flagConfig and currently truthy.
    const seededFlags = new Set<string>();
    flagConfig.forEach((fc) => {
      if (fc.key === 'taking_test') return;
      if (blob[fc.key]) seededFlags.add(fc.key);
    });
    setSelectedFlags(seededFlags);
    // Testing: object form is the only valid state today; legacy boolean true
    // is treated as "no subjects" (matches TestingSetupSection's read).
    const tt = blob.taking_test;
    setTesting(tt && typeof tt === 'object' ? (tt as TestingState) : {});
    // Checklist: any task key in the blob counts as selected. Custom keys
    // come prefixed with "custom:" already (per addCustomTask convention).
    const seededChecklist = new Set<string>();
    const tasks = (currentFlags.tasks ?? {}) as Record<string, unknown>;
    Object.keys(tasks).forEach((k) => {
      // Legacy "custom" string-value shape: convert to "custom:<text>" form
      // so the modal renders + saves through the canonical path.
      const v = tasks[k];
      if (k === 'custom' && typeof v === 'string' && v.length > 0) {
        seededChecklist.add(`${CUSTOM_PREFIX}${v}`);
      } else {
        seededChecklist.add(k);
      }
    });
    setSelectedChecklist(seededChecklist);
    setCustomTask('');
    // Note: prefer the array form (only undone notes) over legacy single string.
    const teacherNotes = currentFlags.teacher_notes;
    if (Array.isArray(teacherNotes)) {
      const undone = teacherNotes.filter((n) => !n.done).map((n) => n.text);
      setNote(undone.join('\n'));
    } else if (typeof currentFlags.teacher_note === 'string') {
      setNote(currentFlags.teacher_note);
    } else {
      setNote('');
    }
  }, [isOpen, currentFlags, flagConfig]);

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
          <div className={styles.detailSectionTitle}>{testingTitle}</div>
          <TestingSetupSection
            student={student}
            currentFlags={syntheticFlags}
            onChange={setTesting}
            tense={testingTense}
            hideTitle
            sectionLabel={testingTitle}
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
