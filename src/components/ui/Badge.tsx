import styles from './Badge.module.css';

type BadgeVariant =
  | 'math'
  | 'reading'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'portal'
  | 'admin'
  | 'staff'
  | 'internal'
  | 'parent';

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export default function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${className || ''}`}>
      {children}
    </span>
  );
}
