import { MessageSquare, Smartphone } from 'lucide-react';
import type { Attendance } from '@/lib/types';
import { formatTime } from '@/lib/types';

interface SmsStatusIndicatorProps {
  attendance: Attendance;
  variant: 'card' | 'row' | 'detail';
}

export default function SmsStatusIndicator({
  attendance,
  variant,
}: SmsStatusIndicatorProps) {
  if (!attendance.sms_10min_sent) return null;

  if (variant === 'card') {
    return (
      <span title="Parent notified via SMS">
        <MessageSquare size={14} color="var(--secondary)" />
      </span>
    );
  }

  if (variant === 'row') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '11px',
          fontWeight: 500,
          color: 'var(--neutral)',
          marginTop: '2px',
        }}
      >
        <Smartphone size={11} />
        <span>Parent notified</span>
      </div>
    );
  }

  // detail variant — full info bar
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 14px',
        borderRadius: '8px',
        background: 'var(--secondary-ul)',
        border: '1px solid var(--secondary-light)',
        fontSize: '12px',
        fontWeight: 500,
        color: 'var(--secondary-dark)',
      }}
    >
      <Smartphone size={14} />
      <span>
        Parent notified
        {attendance.sms_recipient_name && ` (${attendance.sms_recipient_name})`}
        {attendance.sms_10min_sent_at &&
          ` at ${formatTime(attendance.sms_10min_sent_at)}`}
      </span>
    </div>
  );
}
