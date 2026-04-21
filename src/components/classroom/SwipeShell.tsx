'use client';

import { useEffect, useRef, useCallback, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import RowIndicatorBar from './RowIndicatorBar';
import styles from './SwipeShell.module.css';

export interface RowSummary {
  id: string;
  label: string;
  section: string;
  seats: number;
}

export interface SwipeShellProps {
  rows: RowSummary[];
  currentRowIndex: number;
  onRowChange: (newIndex: number) => void;
  /** Top bar — typically a <RowMetaBar /> for the current row. */
  topBar: ReactNode;
  /** Render prop: returns the per-row content (cards, popovers, placeholder). */
  children: (row: RowSummary, index: number) => ReactNode;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function SwipeShell({
  rows,
  currentRowIndex,
  onRowChange,
  topBar,
  children,
}: SwipeShellProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollDebounceRef = useRef<number | null>(null);
  const programmaticScrollRef = useRef(false);
  const reducedMotionRef = useRef<boolean>(false);

  // Refresh reduced-motion check on each interaction (cheap)
  reducedMotionRef.current = prefersReducedMotion();

  // Programmatic scroll when currentRowIndex changes externally (URL, dot click, key, button)
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const slide = track.children[currentRowIndex] as HTMLElement | undefined;
    if (!slide) return;
    programmaticScrollRef.current = true;
    track.scrollTo({
      left: slide.offsetLeft,
      behavior: reducedMotionRef.current ? 'auto' : 'smooth',
    });
    // Release the flag after scroll settles. 350ms covers smooth-scroll across
    // a single viewport on typical hardware without leaving it stuck.
    const t = window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 350);
    return () => window.clearTimeout(t);
  }, [currentRowIndex]);

  const handleScroll = useCallback(() => {
    if (programmaticScrollRef.current) return;
    if (scrollDebounceRef.current !== null) {
      window.clearTimeout(scrollDebounceRef.current);
    }
    scrollDebounceRef.current = window.setTimeout(() => {
      const track = trackRef.current;
      if (!track) return;
      const width = track.clientWidth;
      if (width === 0) return;
      const nextIndex = Math.round(track.scrollLeft / width);
      const clamped = Math.max(0, Math.min(rows.length - 1, nextIndex));
      if (clamped !== currentRowIndex) {
        onRowChange(clamped);
      }
    }, 80);
  }, [currentRowIndex, onRowChange, rows.length]);

  // Cleanup pending debounce on unmount
  useEffect(() => () => {
    if (scrollDebounceRef.current !== null) {
      window.clearTimeout(scrollDebounceRef.current);
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (target.isContentEditable) return;
      }
      if (e.key === 'ArrowLeft' && currentRowIndex > 0) {
        e.preventDefault();
        onRowChange(currentRowIndex - 1);
      } else if (e.key === 'ArrowRight' && currentRowIndex < rows.length - 1) {
        e.preventDefault();
        onRowChange(currentRowIndex + 1);
      }
    },
    [currentRowIndex, onRowChange, rows.length]
  );

  return (
    <div
      ref={rootRef}
      className={styles.shell}
      tabIndex={0}
      role="region"
      aria-label="Live Class Row View with swipe navigation"
      onKeyDown={handleKeyDown}
    >
      {topBar}
      <RowIndicatorBar
        rows={rows}
        currentIndex={currentRowIndex}
        onChange={onRowChange}
      />
      <div className={styles.viewport}>
        <div
          ref={trackRef}
          className={styles.track}
          onScroll={handleScroll}
        >
          {rows.map((row, idx) => (
            <section
              key={row.id}
              className={styles.slide}
              aria-label={`${row.section} ${row.label}`}
              data-row-index={idx}
            >
              {children(row, idx)}
            </section>
          ))}
        </div>
      </div>
      <div className={styles.swipeHint} role="note" aria-live="off">
        <ChevronLeft size={15} aria-hidden="true" />
        <span>Swipe left or right to change rows</span>
        <ChevronRight size={15} aria-hidden="true" />
      </div>
    </div>
  );
}
