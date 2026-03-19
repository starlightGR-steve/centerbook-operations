import { getSessionDuration } from '@/lib/types';

interface DurationBadgeProps {
  subjects: string | string[] | null | undefined;
  scheduleDetail?: Record<string, { start: string; sort_key: number; duration: number }> | null;
}

export default function DurationBadge({ subjects, scheduleDetail }: DurationBadgeProps) {
  const duration = getSessionDuration(subjects, scheduleDetail ? { scheduleDetail } : undefined);

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 600,
        background: 'var(--base)',
        color: 'var(--neutral)',
      }}
    >
      {duration} min
    </span>
  );
}
