import Skeleton from '@/components/ui/Skeleton';

export default function LibrarySkeleton() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
      gap: '20px',
    }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{
          background: 'var(--white)',
          borderRadius: '10px',
          border: '1px solid var(--border)',
          padding: '28px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
            <Skeleton width="48px" height="48px" borderRadius="10px" />
          </div>
          <Skeleton variant="text" width="80%" height="15px" />
          <Skeleton variant="text" width="60%" height="12px" />
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
            <Skeleton width="60px" height="18px" borderRadius="4px" />
            <Skeleton width="40px" height="18px" borderRadius="4px" />
          </div>
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)' }}>
            <Skeleton width="70px" height="20px" borderRadius="4px" />
          </div>
        </div>
      ))}
    </div>
  );
}
