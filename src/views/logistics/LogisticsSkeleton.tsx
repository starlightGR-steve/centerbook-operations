import Skeleton from '@/components/ui/Skeleton';

export default function LogisticsSkeleton() {
  const days = 4;
  const slots = 5;

  return (
    <div style={{
      background: 'var(--white)',
      borderRadius: '10px',
      border: '1px solid var(--border)',
      overflow: 'hidden',
      padding: '0 16px',
    }}>
      {/* Table header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `100px repeat(${days}, 1fr)`,
        borderBottom: '1px solid var(--border)',
        padding: '14px 0',
        gap: 'var(--space-2)',
      }}>
        <Skeleton variant="text" width="60px" height="13px" />
        {Array.from({ length: days }).map((_, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'center' }}>
            <Skeleton variant="text" width="80px" height="13px" />
          </div>
        ))}
      </div>
      {/* Table rows */}
      {Array.from({ length: slots }).map((_, r) => (
        <div key={r} style={{
          display: 'grid',
          gridTemplateColumns: `100px repeat(${days}, 1fr)`,
          borderBottom: r < slots - 1 ? '1px solid var(--border)' : 'none',
          padding: '16px 0',
          gap: 'var(--space-2)',
        }}>
          <Skeleton variant="text" width="70px" height="14px" />
          {Array.from({ length: days }).map((_, c) => (
            <div key={c} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-1_5)' }}>
              <Skeleton width="56px" height="22px" borderRadius="4px" />
              <Skeleton width="80%" height="6px" borderRadius="3px" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
