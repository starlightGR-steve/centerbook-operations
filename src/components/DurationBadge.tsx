import { getSessionDuration } from '@/lib/types';

interface DurationBadgeProps {
  subjects: string | string[] | null | undefined;
}

export default function DurationBadge({ subjects }: DurationBadgeProps) {
  const duration = getSessionDuration(subjects);

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
