import Skeleton from '@/components/ui/Skeleton';

export default function StaffSkeleton() {
  return (
    <div style={{
      background: 'var(--white)',
      borderRadius: '10px',
      border: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      {/* Table header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 100px 120px 100px 40px',
        gap: '12px',
        padding: '14px 24px',
        borderBottom: '1px solid var(--border)',
      }}>
        <Skeleton variant="text" width="80px" height="11px" />
        <Skeleton variant="text" width="50px" height="11px" />
        <Skeleton variant="text" width="70px" height="11px" />
        <Skeleton variant="text" width="50px" height="11px" />
        <div />
      </div>
      {/* Table rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{
          display: 'grid',
          gridTemplateColumns: '1fr 100px 120px 100px 40px',
          gap: '12px',
          padding: '16px 24px',
          borderBottom: i < 4 ? '1px solid var(--border)' : 'none',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Skeleton variant="circle" width="36px" borderRadius="8px" />
            <div>
              <Skeleton variant="text" width="100px" height="14px" />
              <Skeleton variant="text" width="70px" height="11px" />
            </div>
          </div>
          <Skeleton width="56px" height="22px" borderRadius="4px" />
          <Skeleton variant="text" width="80px" height="12px" />
          <Skeleton variant="text" width="40px" height="20px" />
          <Skeleton variant="circle" width="20px" />
        </div>
      ))}
    </div>
  );
}
