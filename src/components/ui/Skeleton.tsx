import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  variant?: 'text' | 'circle' | 'rect';
  className?: string;
}

export default function Skeleton({
  width,
  height,
  borderRadius,
  variant = 'rect',
  className = '',
}: SkeletonProps) {
  const variantRadius =
    variant === 'circle' ? '50%' : variant === 'text' ? '4px' : '8px';

  return (
    <div
      className={`${styles.skeleton} ${className}`}
      style={{
        width: variant === 'circle' ? (width || '40px') : (width || '100%'),
        height: variant === 'circle' ? (height || width || '40px') : (height || '16px'),
        borderRadius: borderRadius || variantRadius,
      }}
      aria-hidden="true"
    />
  );
}
