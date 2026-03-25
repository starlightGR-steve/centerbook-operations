'use client';

import { useEffect, useCallback, useRef } from 'react';
import styles from './UndoToast.module.css';

interface UndoToastItem {
  id: number;
  message: string;
  onUndo: () => void | Promise<void>;
}

interface UndoToastProps {
  item: UndoToastItem | null;
  duration?: number;
  onDismiss: () => void;
}

export type { UndoToastItem };

export default function UndoToast({ item, duration = 3000, onDismiss }: UndoToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const dismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  const handleUndo = useCallback(async () => {
    if (!item) return;
    try {
      await item.onUndo();
    } catch {
      // silently fail — SWR will re-sync
    }
    dismiss();
  }, [item, dismiss]);

  // Auto-dismiss timer
  useEffect(() => {
    if (!item) return;
    timerRef.current = setTimeout(dismiss, duration);
    return () => clearTimeout(timerRef.current);
  }, [item, duration, dismiss]);

  if (!item) return null;

  return (
    <div
      className={styles.toast}
      style={{ '--duration': `${duration}ms` } as React.CSSProperties}
    >
      <span className={styles.message}>{item.message}</span>
      <button className={styles.undoBtn} onClick={handleUndo}>
        Undo
      </button>
      <div className={styles.progress} />
    </div>
  );
}
