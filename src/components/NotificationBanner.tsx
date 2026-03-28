'use client';

import { useState } from 'react';
import { DollarSign, AlertTriangle, AlertCircle, UserCheck } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import type { Notification } from '@/lib/types';
import styles from './NotificationBanner.module.css';

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const diffMins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  return `${Math.floor(diffMins / 60)}h ago`;
}

type CardVariant = 'green' | 'red' | 'amber' | 'indigo';

interface CardDef {
  variant: CardVariant;
  icon: React.ReactNode;
  content: string;
  subtitle: string;
  actionLabel: string;
  isReview: boolean;
}

function getCardDef(n: Notification): CardDef {
  const name = [n.student_first_name, n.student_last_name].filter(Boolean).join(' ');
  const subjectLevel = [n.subject, n.level].filter(Boolean).join(' ');

  if (n.type === 'test_result' && n.result === 'passed') {
    return {
      variant: 'green',
      icon: <DollarSign size={20} />,
      content: `${name} passed ${subjectLevel} test`,
      subtitle: `(certificate + $1)${n.notes ? ' — ' + n.notes : ''}`,
      actionLabel: 'Done',
      isReview: false,
    };
  }
  if (n.type === 'test_result' && n.result === 'review') {
    const sub = [n.worksheet_instructions, n.review_notes, n.notes].filter(Boolean).join(' — ');
    return {
      variant: 'red',
      icon: <AlertTriangle size={20} />,
      content: `${name} needs review worksheets for ${subjectLevel}`,
      subtitle: sub,
      actionLabel: 'Done',
      isReview: false,
    };
  }
  if (n.type === 'test_result' && n.result === 'borderline') {
    return {
      variant: 'amber',
      icon: <AlertCircle size={20} />,
      content: `${name} borderline on ${subjectLevel} test`,
      subtitle: n.notes || '',
      actionLabel: 'Review',
      isReview: true,
    };
  }
  return {
    variant: 'indigo',
    icon: <UserCheck size={20} />,
    content: `${name} flagged for Amy`,
    subtitle: n.notes || '',
    actionLabel: 'Got it',
    isReview: false,
  };
}

const VARIANT_STYLES: Record<CardVariant, { bg: string; iconColor: string; actionCls: string }> = {
  green:  { bg: '#dcfce7', iconColor: '#16a34a', actionCls: styles.actionGreen },
  red:    { bg: '#fee2e2', iconColor: '#dc2626', actionCls: styles.actionRed },
  amber:  { bg: '#fef3c7', iconColor: '#92400e', actionCls: styles.actionAmber },
  indigo: { bg: '#e0e7ff', iconColor: '#1e335e', actionCls: styles.actionIndigo },
};

interface CardProps {
  notification: Notification;
  onDismiss: () => void;
  onReview: () => void;
}

function NotificationCard({ notification: n, onDismiss, onReview }: CardProps) {
  const def = getCardDef(n);
  const vs = VARIANT_STYLES[def.variant];
  return (
    <div className={styles.card} style={{ background: vs.bg }}>
      <span className={styles.cardIcon} style={{ color: vs.iconColor }}>
        {def.icon}
      </span>
      <div className={styles.cardBody}>
        <p className={styles.cardContent}>{def.content}</p>
        {def.subtitle && <p className={styles.cardSubtitle}>{def.subtitle}</p>}
        <p className={styles.cardTime}>{formatTime(n.created_at)}</p>
      </div>
      <button
        className={`${styles.actionBtn} ${vs.actionCls}`}
        onClick={def.isReview ? onReview : onDismiss}
      >
        {def.actionLabel}
      </button>
    </div>
  );
}

interface ReviewPanelProps {
  notification: Notification;
  onClose: () => void;
  review: (id: number, decision: string, worksheetInstructions?: string, reviewNotes?: string) => Promise<void>;
}

function ReviewPanel({ notification: n, onClose, review }: ReviewPanelProps) {
  const [decision, setDecision] = useState<'passed' | 'review_retest' | null>(null);
  const [worksheets, setWorksheets] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const name = [n.student_first_name, n.student_last_name].filter(Boolean).join(' ');
  const subjectLevel = [n.subject, n.level].filter(Boolean).join(' ');

  const handleSend = async () => {
    if (!decision || submitting) return;
    setSubmitting(true);
    try {
      await review(n.id, decision, worksheets || undefined, notes || undefined);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.reviewPanel} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.reviewTitle}>Review Test Result</h3>
        <p className={styles.reviewMeta}>
          <strong>{name}</strong> — {subjectLevel}
        </p>
        {n.creator_name && (
          <p className={styles.reviewMeta}>Submitted by {n.creator_name}</p>
        )}
        {n.notes && (
          <div className={styles.teacherNotes}>
            <p className={styles.teacherNotesLabel}>Teacher&apos;s notes</p>
            <p className={styles.teacherNotesText}>{n.notes}</p>
          </div>
        )}
        <div className={styles.decisionRow}>
          <button
            className={`${styles.decisionBtn} ${decision === 'passed' ? styles.decisionPassed : ''}`}
            onClick={() => setDecision('passed')}
          >
            Passed
          </button>
          <button
            className={`${styles.decisionBtn} ${decision === 'review_retest' ? styles.decisionRetest : ''}`}
            onClick={() => setDecision('review_retest')}
          >
            Review &amp; Retest
          </button>
        </div>
        {decision === 'review_retest' && (
          <div className={styles.retestSection}>
            <label className={styles.retestLabel}>Worksheets to pull</label>
            <input
              className={styles.retestInput}
              type="text"
              placeholder="e.g. C81–C100"
              value={worksheets}
              onChange={(e) => setWorksheets(e.target.value)}
            />
            <label className={styles.retestLabel}>Additional notes for Fran</label>
            <textarea
              className={styles.retestTextarea}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        )}
        <div className={styles.reviewActions}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            className={styles.sendBtn}
            disabled={!decision || submitting}
            onClick={handleSend}
          >
            {submitting ? 'Sending…' : 'Send to Fran →'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NotificationBanner({ staffId }: { staffId: number }) {
  const { notifications, dismiss, review } = useNotifications(staffId);
  const [reviewNotif, setReviewNotif] = useState<Notification | null>(null);

  if (!notifications.length && !reviewNotif) return null;

  return (
    <>
      {notifications.length > 0 && (
        <div className={styles.banner}>
          {notifications.map((n) => (
            <NotificationCard
              key={n.id}
              notification={n}
              onDismiss={() => dismiss(n.id)}
              onReview={() => setReviewNotif(n)}
            />
          ))}
        </div>
      )}
      {reviewNotif && (
        <ReviewPanel
          notification={reviewNotif}
          onClose={() => setReviewNotif(null)}
          review={review}
        />
      )}
    </>
  );
}
