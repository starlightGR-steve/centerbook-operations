'use client';

import { useState, useMemo } from 'react';
import type { Student } from '@/lib/types';
import styles from './RecordTestForm.module.css';

export type TestResult = 'passed' | 'review_retest' | 'borderline' | 'postponed';
export type TestSubject = 'math' | 'reading';

export interface RecordTestPayload {
  type: 'test_result';
  student_id: number;
  subject: TestSubject;
  level: string;
  result: TestResult;
  notes: string;
  needs_manager_review: boolean;
}

export interface RecordTestFormProps {
  student: Student;
  activeSubjects: { math?: string; reading?: string };
  onSubmit: (payload: RecordTestPayload) => Promise<void>;
  onCancel: () => void;
}

const RESULT_OPTIONS: Array<{ value: TestResult; label: string; styleKey: string }> = [
  { value: 'passed', label: 'Passed', styleKey: 'pass' },
  { value: 'review_retest', label: 'Review & retest', styleKey: 'retest' },
  { value: 'borderline', label: 'Borderline', styleKey: 'borderline' },
  { value: 'postponed', label: 'Postponed', styleKey: 'postpone' },
];

const OUTCOME_COPY: Record<TestResult, string> = {
  passed:
    'Fran will be notified to prepare certificate + $1 and pull homework for next level',
  review_retest: 'Fran will be notified to pull review worksheets',
  borderline: 'This will be sent to Amy/Bincy for review before going to Fran',
  postponed:
    "Test will be added to this student's next class plan. No one notified.",
};

export default function RecordTestForm({
  student,
  activeSubjects,
  onSubmit,
  onCancel,
}: RecordTestFormProps) {
  const subjectsList = useMemo(
    () =>
      (Object.entries(activeSubjects) as Array<[TestSubject, string]>).filter(
        ([, lvl]) => !!lvl
      ),
    [activeSubjects]
  );

  const [activeSubject, setActiveSubject] = useState<TestSubject>(
    () => subjectsList[0]?.[0] ?? 'math'
  );
  const [result, setResult] = useState<TestResult | null>(null);
  const [notes, setNotes] = useState('');
  const [needsReview, setNeedsReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const showReviewCheckbox = result === 'passed' || result === 'review_retest';
  const currentLevel = activeSubjects[activeSubject] ?? '';

  const handleSubmit = async () => {
    if (!result || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({
        type: 'test_result',
        student_id: student.id,
        subject: activeSubject,
        level: currentLevel,
        result,
        notes: notes.trim(),
        needs_manager_review: showReviewCheckbox ? needsReview : false,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.form}>
      <div className={styles.header}>
        <span className={styles.headerLabel}>Recording test for</span>
        <div className={styles.subjectRow}>
          {subjectsList.map(([subject, level]) => (
            <button
              key={subject}
              type="button"
              className={`${styles.subjectPill} ${styles[`pill_${subject}`]} ${
                activeSubject === subject ? styles.subjectActive : ''
              }`}
              onClick={() => setActiveSubject(subject)}
              disabled={subjectsList.length === 1}
            >
              {subject === 'math' ? 'Math' : 'Reading'} <span className={styles.levelTag}>{level}</span>
            </button>
          ))}
        </div>
      </div>

      <fieldset className={styles.resultGroup}>
        <legend className={styles.fieldLabel}>Result</legend>
        <div className={styles.resultRow} role="radiogroup">
          {RESULT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={result === opt.value}
              className={`${styles.resultChip} ${styles[`chip_${opt.styleKey}`]} ${
                result === opt.value ? styles.chipSelected : ''
              }`}
              onClick={() => setResult(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </fieldset>

      {result && (
        <div className={`${styles.outcomeBox} ${styles[`outcome_${result}`]}`}>
          {OUTCOME_COPY[result]}
        </div>
      )}

      <label className={styles.notesField}>
        <span className={styles.fieldLabel}>Notes</span>
        <textarea
          className={styles.notesInput}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes on the test..."
          rows={3}
        />
      </label>

      {showReviewCheckbox && (
        <label className={styles.reviewRow}>
          <input
            type="checkbox"
            checked={needsReview}
            onChange={(e) => setNeedsReview(e.target.checked)}
          />
          <span>Send to Amy/Bincy for review first</span>
        </label>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="button"
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={!result || submitting}
        >
          {submitting ? 'Saving...' : 'Submit'}
        </button>
      </div>
    </div>
  );
}
