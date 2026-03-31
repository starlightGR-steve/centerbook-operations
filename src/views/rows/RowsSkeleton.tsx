import Skeleton from '@/components/ui/Skeleton';
import styles from './RowsPage.module.css';

export default function RowsSkeleton() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Skeleton variant="circle" width="20px" />
            <Skeleton variant="text" width="80px" height="16px" />
          </div>
          <div style={{ display: 'flex', gap: '2px' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} width="36px" height="28px" borderRadius="6px" />
            ))}
          </div>
        </div>
        <Skeleton width="80px" height="24px" borderRadius="6px" />
      </header>

      <div className={styles.content}>
        <div className={styles.gridWrap}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
            gap: '16px',
          }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{
                aspectRatio: '1',
                background: 'var(--white)',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}>
                <div>
                  <Skeleton variant="text" width="70%" height="16px" />
                  <div style={{ marginTop: 'var(--space-2)', display: 'flex', gap: 'var(--space-1_5)' }}>
                    <Skeleton width="50px" height="20px" borderRadius="4px" />
                    <Skeleton width="40px" height="20px" borderRadius="4px" />
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <Skeleton variant="text" width="60px" height="32px" />
                  <Skeleton variant="text" width="80px" height="11px" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
