import { HTMLAttributes } from 'react';
import styles from './Card.module.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export default function Card({ className, children, style, ...props }: CardProps) {
  return (
    <div className={`${styles.card} ${className || ''}`} style={style} {...props}>
      {children}
    </div>
  );
}
