'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface ClockDisplayProps {
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const SIZES = {
  sm: { fontSize: '15px', iconSize: 16 },
  md: { fontSize: '18px', iconSize: 18 },
  lg: { fontSize: '22px', iconSize: 20 },
};

export default function ClockDisplay({ size = 'md', showIcon = true }: ClockDisplayProps) {
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

  const s = SIZES[size];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {showIcon && <Clock size={s.iconSize} color="var(--secondary)" />}
      <span
        style={{
          fontSize: s.fontSize,
          fontWeight: 700,
          color: 'var(--primary)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {time}
      </span>
    </div>
  );
}
