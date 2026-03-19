'use client';

import { useState } from 'react';
import { Clock } from 'lucide-react';
import { useSessionAdjust } from '@/context/SessionAdjustContext';
import { getSessionDuration } from '@/lib/types';

interface SessionTimeAdjustProps {
  studentId: number;
  subjects: string | string[] | null;
  scheduleDetail?: Record<string, { start: string; sort_key: number; duration: number }> | null;
}

export default function SessionTimeAdjust({ studentId, subjects, scheduleDetail }: SessionTimeAdjustProps) {
  const [open, setOpen] = useState(false);
  const { getAdjustment, setAdjustment, adjustBy } = useSessionAdjust();

  const adj = getAdjustment(studentId);
  const base = getSessionDuration(subjects || '', scheduleDetail ? { scheduleDetail } : undefined);
  const current = base + adj;

  return (
    <div
      style={{ position: 'relative' }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => setOpen(!open)}
        aria-label="Adjust session time"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: '1px solid var(--border)',
          background: 'var(--white)',
          color: 'var(--neutral)',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        <Clock size={14} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            right: 0,
            marginBottom: 6,
            background: 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
            zIndex: 20,
            padding: 10,
            minWidth: 160,
          }}
        >
          <p
            style={{
              margin: '0 0 8px',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--neutral)',
              textAlign: 'center',
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            Session Time
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginBottom: 8,
            }}
          >
            <button
              onClick={() => adjustBy(studentId, -15)}
              style={{
                width: 32,
                height: 28,
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--white)',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--primary)',
                cursor: 'pointer',
              }}
            >
              -15
            </button>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--primary)',
                minWidth: 40,
                textAlign: 'center',
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              {current}m
            </span>
            <button
              onClick={() => adjustBy(studentId, 15)}
              style={{
                width: 32,
                height: 28,
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--white)',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--primary)',
                cursor: 'pointer',
              }}
            >
              +15
            </button>
          </div>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
            {[30, 45, 60, 75, 90].map((d) => (
              <button
                key={d}
                onClick={() => setAdjustment(studentId, d - base)}
                style={{
                  padding: '3px 6px',
                  borderRadius: 4,
                  border: '1px solid var(--border)',
                  background: 'var(--base)',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: 10,
                  fontWeight: 600,
                  color: 'var(--neutral)',
                  cursor: 'pointer',
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
