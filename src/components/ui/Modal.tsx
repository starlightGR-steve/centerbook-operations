'use client';

import { useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import styles from './Modal.module.css';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
  /**
   * Suppress the backdrop-click close. Use when the dialog hosts native
   * controls (e.g. <input type="time">) whose dismissal click can land on
   * the overlay and incorrectly tear down the dialog. The X button and
   * Escape key remain functional.
   */
  disableBackdropClose?: boolean;
}

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth,
  disableBackdropClose,
}: ModalProps) {
  const titleId = useId();
  const containerRef = useFocusTrap(open, onClose);

  if (!open) return null;
  // Render as a portal under <body> so the dialog escapes any parent stacking
  // context (e.g. the kiosk CheckInPopup mounts at z-index 1001 — without the
  // portal, this overlay's z-index 50 would sit behind the host popup and the
  // dialog would render invisibly inside it).
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (disableBackdropClose) return;
        // Only close if the click target is the overlay itself (not a child or native picker)
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        className={styles.modal}
        style={maxWidth ? { maxWidth } : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className={styles.header}>
          <div>
            <h3 id={titleId} className={styles.headerTitle}>{title}</h3>
            {subtitle && <p className={styles.headerSub}>{subtitle}</p>}
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close dialog">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
