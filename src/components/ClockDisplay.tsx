'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface ClockDisplayProps {
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  /** 'brand' (default): teal icon + primary-blue 700-weight text.
   *  'muted': neutral-gray icon + neutral-gray 600-weight text. Used by the
   *  Live Classroom top bar per Whole Class V13 spec. */
  variant?: 'brand' | 'muted';
}

const SIZES = {
  sm: { fontSize: '15px', iconSize: 16 },
  md: { fontSize: '18px', iconSize: 18 },
  lg: { fontSize: '22px', iconSize: 20 },
};

const MUTED_SIZES = {
  sm: { fontSize: 'var(--text-base)', iconSize: 14 },
  md: { fontSize: 'var(--text-md)', iconSize: 16 },
  lg: { fontSize: 'var(--text-lg)', iconSize: 18 },
};

export default function ClockDisplay({
  size = 'md',
  showIcon = true,
  variant = 'brand',
}: ClockDisplayProps) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const isMuted = variant === 'muted';
  const s = isMuted ? MUTED_SIZES[size] : SIZES[size];
  const iconColor = isMuted ? 'var(--neutral)' : 'var(--secondary)';
  const textColor = isMuted ? 'var(--neutral)' : 'var(--primary)';
  const fontWeight = isMuted ? 600 : 700;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {showIcon && <Clock size={s.iconSize} color={iconColor} />}
      <span
        style={{
          fontSize: s.fontSize,
          fontWeight,
          color: textColor,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {time}
      </span>
    </div>
  );
}
