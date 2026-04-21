'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Pencil, Check } from 'lucide-react';
import { useSessionAdjust } from '@/context/SessionAdjustContext';
import { updateAttendance } from '@/hooks/useAttendance';
import styles from './TimePopover.module.css';

const PRESETS = [30, 45, 60, 90] as const;
const ADJUSTMENTS = [-5, -1, 1, 5] as const;

export interface TimePopoverProps {
  /** When undefined, popover runs in draft mode (no PUT, surfaces changes via onDraftChange). */
  attendanceId?: number;
  studentId: number;
  initialDurationMinutes: number;
  initialCheckIn: string; // ISO datetime
  isOpen: boolean;
  onClose: () => void;
  onDraftChange?: (state: { durationMinutes: number; checkIn?: string }) => void;
}

function formatTime12h(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

function isoToTimeInput(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function timeInputToIso(timeStr: string, baseIso: string): string {
  const base = new Date(baseIso);
  const [h, m] = timeStr.split(':').map(Number);
  const next = new Date(base);
  next.setHours(h, m, 0, 0);
  return next.toISOString();
}

function endIso(checkIn: string, durationMinutes: number): string {
  return new Date(new Date(checkIn).getTime() + durationMinutes * 60_000).toISOString();
}

function diffMinutes(startIso: string, endTimeIso: string): number {
  return Math.round((new Date(endTimeIso).getTime() - new Date(startIso).getTime()) / 60_000);
}

export default function TimePopover({
  attendanceId,
  studentId,
  initialDurationMinutes,
  initialCheckIn,
  isOpen,
  onClose,
  onDraftChange,
}: TimePopoverProps) {
  const isDraft = attendanceId === undefined;
  const { persistAdjustment } = useSessionAdjust();
  const containerRef = useRef<HTMLDivElement>(null);

  const [currentDuration, setCurrentDuration] = useState(initialDurationMinutes);
  const [currentCheckIn, setCurrentCheckIn] = useState(initialCheckIn);
  const [editingRow, setEditingRow] = useState<'start' | 'end' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');

  // Reset internal state when the popover opens or initial inputs change
  useEffect(() => {
    if (!isOpen) return;
    setCurrentDuration(initialDurationMinutes);
    setCurrentCheckIn(initialCheckIn);
    setEditingRow(null);
    setErrorMessage(null);
  }, [isOpen, initialDurationMinutes, initialCheckIn]);

  // Click-outside closes (live mode only — in draft mode the parent owns visibility)
  useEffect(() => {
    if (!isOpen || isDraft) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, isDraft, onClose]);

  // Escape closes in both modes
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const persist = useCallback(
    (newDuration: number, newCheckIn?: string) => {
      if (isDraft) {
        onDraftChange?.({
          durationMinutes: newDuration,
          ...(newCheckIn ? { checkIn: newCheckIn } : {}),
        });
        return;
      }
      if (newCheckIn && newCheckIn !== currentCheckIn) {
        // SessionAdjustContext only handles duration; check_in writes go direct.
        updateAttendance(attendanceId!, {
          check_in: newCheckIn,
          session_duration_minutes: newDuration,
        }).catch((err) => {
          console.error('TimePopover: updateAttendance failed', err);
          setErrorMessage('Failed to save change.');
        });
      } else {
        persistAdjustment(attendanceId!, studentId, newDuration);
      }
    },
    [isDraft, attendanceId, studentId, currentCheckIn, persistAdjustment, onDraftChange]
  );

  const setPreset = (mins: number) => {
    setCurrentDuration(mins);
    setErrorMessage(null);
    persist(mins);
  };

  const adjustDuration = (delta: number) => {
    const next = Math.max(1, currentDuration + delta);
    if (next === currentDuration) return;
    setCurrentDuration(next);
    setErrorMessage(null);
    persist(next);
  };

  const openStartEdit = () => {
    setEditingRow('start');
    setStartInput(isoToTimeInput(currentCheckIn));
    setErrorMessage(null);
  };

  const openEndEdit = () => {
    setEditingRow('end');
    setEndInput(isoToTimeInput(endIso(currentCheckIn, currentDuration)));
    setErrorMessage(null);
  };

  const saveStart = () => {
    if (!startInput) return;
    const newStart = timeInputToIso(startInput, currentCheckIn);
    const end = endIso(currentCheckIn, currentDuration);
    const newDuration = diffMinutes(newStart, end);
    if (newDuration <= 0) {
      setErrorMessage('End time must be after start time.');
      return;
    }
    setCurrentCheckIn(newStart);
    setCurrentDuration(newDuration);
    setEditingRow(null);
    persist(newDuration, newStart);
  };

  const saveEnd = () => {
    if (!endInput) return;
    const newEnd = timeInputToIso(endInput, currentCheckIn);
    const newDuration = diffMinutes(currentCheckIn, newEnd);
    if (newDuration <= 0) {
      setErrorMessage('End time must be after start time.');
      return;
    }
    setCurrentDuration(newDuration);
    setEditingRow(null);
    persist(newDuration);
  };

  if (!isOpen) return null;

  const startDisplay = formatTime12h(currentCheckIn);
  const endDisplay = formatTime12h(endIso(currentCheckIn, currentDuration));

  return (
    <div
      ref={containerRef}
      className={styles.popover}
      role="dialog"
      aria-label="Adjust session time"
    >
      <div className={styles.topLabel}>Session time</div>
      <div className={styles.bigDuration}>{currentDuration}m</div>

      <div className={styles.section}>
        <div className={styles.helperLabel}>Set to</div>
        <div className={styles.presetRow}>
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              className={`${styles.presetBtn} ${currentDuration === p ? styles.presetActive : ''}`}
              onClick={() => setPreset(p)}
            >
              {p}m
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.helperLabel}>Adjust by</div>
        <div className={styles.adjustRow}>
          {ADJUSTMENTS.map((d) => (
            <button
              key={d}
              type="button"
              className={styles.adjustBtn}
              onClick={() => adjustDuration(d)}
              disabled={d < 0 && currentDuration <= 1}
            >
              {d > 0 ? `+${d}` : d}
            </button>
          ))}
        </div>
      </div>

      <hr className={styles.divider} />

      {/* Start edit hidden in draft mode (no attendance yet to back-date). */}
      {!isDraft && (
        <div className={`${styles.timeRow} ${editingRow === 'start' ? styles.timeRowEditing : ''}`}>
          <span className={styles.timeLabel}>Start</span>
          {editingRow === 'start' ? (
            <input
              type="time"
              className={styles.timeInput}
              value={startInput}
              onChange={(e) => setStartInput(e.target.value)}
            />
          ) : (
            <span className={styles.timeValue}>{startDisplay}</span>
          )}
          <button
            type="button"
            className={`${styles.iconBtn} ${editingRow === 'start' ? styles.iconBtnSave : ''}`}
            onClick={() => (editingRow === 'start' ? saveStart() : openStartEdit())}
            aria-label={editingRow === 'start' ? 'Save start time' : 'Edit start time'}
          >
            {editingRow === 'start' ? (
              <Check size={18} strokeWidth={2.5} />
            ) : (
              <Pencil size={18} strokeWidth={2} />
            )}
          </button>
        </div>
      )}

      <div className={`${styles.timeRow} ${editingRow === 'end' ? styles.timeRowEditing : ''}`}>
        <span className={styles.timeLabel}>End</span>
        {editingRow === 'end' ? (
          <input
            type="time"
            className={styles.timeInput}
            value={endInput}
            onChange={(e) => setEndInput(e.target.value)}
          />
        ) : (
          <span className={styles.timeValue}>{endDisplay}</span>
        )}
        <button
          type="button"
          className={`${styles.iconBtn} ${editingRow === 'end' ? styles.iconBtnSave : ''}`}
          onClick={() => (editingRow === 'end' ? saveEnd() : openEndEdit())}
          aria-label={editingRow === 'end' ? 'Save end time' : 'Edit end time'}
        >
          {editingRow === 'end' ? (
            <Check size={18} strokeWidth={2.5} />
          ) : (
            <Pencil size={18} strokeWidth={2} />
          )}
        </button>
      </div>

      {errorMessage && (
        <div className={styles.errorRow} role="alert">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
