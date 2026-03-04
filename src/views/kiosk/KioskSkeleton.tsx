import Skeleton from '@/components/ui/Skeleton';
import Card from '@/components/ui/Card';
import styles from './KioskPage.module.css';

function SkeletonRows({ count, dark }: { count: number; dark?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0' }}>
          <Skeleton variant="circle" width="36px" borderRadius="8px" />
          <div style={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" height="14px" />
            <Skeleton variant="text" width="40%" height="11px" />
          </div>
          {dark ? (
            <Skeleton width="72px" height="32px" borderRadius="6px" />
          ) : (
            <Skeleton variant="circle" width="16px" />
          )}
        </div>
      ))}
    </div>
  );
}

export default function KioskSkeleton() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Skeleton variant="circle" width="40px" borderRadius="12px" />
          <div>
            <Skeleton variant="text" width="120px" height="17px" />
            <Skeleton variant="text" width="160px" height="9px" />
          </div>
        </div>
        <div style={{ flex: 1, maxWidth: '400px', margin: '0 32px' }}>
          <Skeleton height="40px" borderRadius="8px" />
        </div>
        <Skeleton width="80px" height="28px" borderRadius="6px" />
      </div>

      <div className={styles.columns}>
        <Card style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Skeleton variant="text" width="100px" height="15px" />
          <div style={{ marginTop: '16px' }}><SkeletonRows count={5} /></div>
        </Card>
        <Card style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Skeleton variant="text" width="100px" height="15px" />
          <div style={{ marginTop: '16px' }}><SkeletonRows count={3} /></div>
        </Card>
        <div style={{
          background: 'var(--slate)',
          borderRadius: 'var(--radius-card)',
          padding: '28px',
        }}>
          <Skeleton variant="text" width="130px" height="15px" />
          <div style={{ marginTop: '16px' }}><SkeletonRows count={4} dark /></div>
        </div>
      </div>
    </div>
  );
}
