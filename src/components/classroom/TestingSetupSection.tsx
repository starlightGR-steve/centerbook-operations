'use client';

import { ClipboardCheck } from 'lucide-react';
import type { Student, RowAssignmentFlags } from '@/lib/types';
import { parseSubjects } from '@/lib/types';
import { ladderFor, defaultLevelFor, type KumonSubject } from '@/lib/kumon-levels';
import styles from './TestingSetupSection.module.css';

export type TestingState = { math?: string; reading?: string };

export interface TestingSetupSectionProps {
  student: Student;
  currentFlags: RowAssignmentFlags | null | undefined;
  sectionLabel?: string;
  /**
   * Toggle label copy.
   * "present" (Detail Panel, default): "Taking Math test today"
   * "future" (Plan Next Visit, Phase 6 forward-compat): "Will take Math test"
   */
  tense?: 'present' | 'future';
  onChange: (testingState: TestingState) => void;
}

/** Read taking_test as object form. Legacy boolean form returns empty (caller can pre-toggle). */
function readTestingState(flags: RowAssignmentFlags | null | undefined): TestingState {
  const t = flags?.taking_test;
  if (!t || typeof t !== 'object') return {};
  return t;
}

function buildToggleLabel(subjectLabel: string, tense: 'present' | 'future'): string {
  return tense === 'future'
    ? `Will take ${subjectLabel} test`
    : `Taking ${subjectLabel} test today`;
}

export default function TestingSetupSection({
  student,
  currentFlags,
  sectionLabel = 'Testing',
  tense = 'present',
  onChange,
}: TestingSetupSectionProps) {
  const subjects = parseSubjects(student.subjects);
  const state = readTestingState(currentFlags);

  const setSubject = (subject: KumonSubject, enabled: boolean, level?: string) => {
    const next: TestingState = { ...state };
    if (!enabled) {
      delete next[subject];
    } else {
      const currentLevel =
        subject === 'math' ? student.current_level_math : student.current_level_reading;
      next[subject] = level || state[subject] || defaultLevelFor(subject, student.id, currentLevel);
    }
    onChange(next);
  };

  const renderRow = (subject: KumonSubject, subjectLabel: string) => {
    const enabled = subject in state;
    const level = state[subject] ?? '';
    const ladder = ladderFor(subject);
    return (
      <div className={styles.subjectBlock} key={subject}>
        <div className={styles.toggleRow}>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setSubject(subject, e.target.checked)}
            />
            <span className={styles.track} aria-hidden="true">
              <span className={styles.thumb} />
            </span>
            <span className={styles.subjectLabel}>
              {buildToggleLabel(subjectLabel, tense)}
            </span>
          </label>
        </div>
        {enabled && (
          <div className={styles.levelRow}>
            <label className={styles.levelLabel} htmlFor={`testing-${subject}-level`}>
              Level
            </label>
            <select
              id={`testing-${subject}-level`}
              className={styles.levelSelect}
              value={level}
              onChange={(e) => setSubject(subject, true, e.target.value)}
            >
              {ladder.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className={styles.section} aria-label={sectionLabel}>
      <h4 className={styles.sectionLabel}>
        <ClipboardCheck size={18} aria-hidden="true" className={styles.sectionLabelIcon} />
        <span>{sectionLabel}</span>
      </h4>
      <div className={styles.body}>
        {subjects.includes('Math') && renderRow('math', 'Math')}
        {subjects.includes('Reading') && renderRow('reading', 'Reading')}
        {subjects.length === 0 && (
          <p className={styles.empty}>Student has no subjects assigned.</p>
        )}
      </div>
    </section>
  );
}
