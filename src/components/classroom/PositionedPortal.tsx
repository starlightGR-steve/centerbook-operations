'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Portaled, viewport-clamped popover anchored to a DOM element.
 *
 * Placement preference:
 *   1. Above the anchor (popover bottom = anchor top - GAP)
 *   2. Below the anchor (popover top = anchor bottom + GAP) if (1) overflows the viewport top
 *   3. Clamped inside the viewport (with VIEWPORT_PAD breathing room) if neither fits
 *
 * Horizontal: right-aligned with the anchor; left edge clamped to VIEWPORT_PAD if narrow.
 *
 * The wrapper paints with `visibility: hidden` until useLayoutEffect computes the final
 * coordinates, preventing a one-frame flash at (0, 0). Position is captured once on mount
 * (and on anchor change) — no scroll/resize listeners; the parent's outside-click backdrop
 * handles dismissal so position staleness is bounded by interaction.
 *
 * Lifted from views/rows/RowsPage.tsx so StudentDetailPanel (and any future Live Class
 * surface) can reuse the same anchored-popover pattern. Behavior is identical to the
 * original — no logic changes.
 */
const VIEWPORT_PAD = 8;

export interface PositionedPortalProps {
  anchorEl: HTMLElement;
  gap: number;
  className: string;
  onClick?: (e: React.MouseEvent) => void;
  children: ReactNode;
}

export default function PositionedPortal({
  anchorEl,
  gap,
  className,
  onClick,
  children,
}: PositionedPortalProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const anchorRect = anchorEl.getBoundingClientRect();
    const popRect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Vertical placement
    let top: number;
    const aboveTop = anchorRect.top - gap - popRect.height;
    if (aboveTop >= VIEWPORT_PAD) {
      top = aboveTop;
    } else {
      const belowTop = anchorRect.bottom + gap;
      if (belowTop + popRect.height <= vh - VIEWPORT_PAD) {
        top = belowTop;
      } else {
        top = Math.max(VIEWPORT_PAD, vh - VIEWPORT_PAD - popRect.height);
      }
    }

    // Horizontal placement: right-align with anchor, clamp inside viewport
    let left = anchorRect.right - popRect.width;
    if (left < VIEWPORT_PAD) left = VIEWPORT_PAD;
    if (left + popRect.width > vw - VIEWPORT_PAD) {
      left = Math.max(VIEWPORT_PAD, vw - VIEWPORT_PAD - popRect.width);
    }

    setPos({ top, left });
  }, [anchorEl, gap]);

  return createPortal(
    <div
      ref={wrapperRef}
      className={className}
      style={{
        top: pos?.top ?? 0,
        left: pos?.left ?? 0,
        visibility: pos ? 'visible' : 'hidden',
      }}
      onClick={onClick}
    >
      {children}
    </div>,
    document.body
  );
}
