import Skeleton from '@/components/ui/Skeleton';
import styles from './KioskPage.module.css';

function SkeletonRows({ count }: { count: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1_5)' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 10px' }}>
          <div style={{ flex: 1 }}>
            <Skeleton variant="text" width="55%" height="13px" />
            <Skeleton variant="text" width="35%" height="11px" />
          </div>
          <Skeleton variant="circle" width="18px" />
        </div>
      ))}
    </div>
  );
}

export default function KioskSkeleton() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Skeleton width="180px" height="50px" borderRadius="8px" />
        <div style={{ flex: 1, maxWidth: '400px' }}>
          <Skeleton height="42px" borderRadius="24px" />
        </div>
        <Skeleton width="120px" height="32px" borderRadius="6px" />
      </div>

      <div className={styles.columns}>
        <div className={styles.card} style={{ padding: '16px 12px' }}>
          <Skeleton variant="text" width="140px" height="15px" />
          <div style={{ marginTop: 'var(--space-4)' }}><SkeletonRows count={5} /></div>
        </div>
        <div className={styles.card} style={{ padding: '16px 12px' }}>
          <Skeleton variant="text" width="80px" height="15px" />
          <div style={{ marginTop: 'var(--space-4)' }}><SkeletonRows count={4} /></div>
        </div>
        <div className={styles.card} style={{ padding: '16px 12px', background: 'var(--slate)' }}>
          <Skeleton variant="text" width="120px" height="15px" />
          <div style={{ marginTop: 'var(--space-4)' }}><SkeletonRows count={6} /></div>
        </div>
      </div>
    </div>
  );
}
