import styles from './SectionHeader.module.css';

interface SectionHeaderProps {
  script?: string;
  title: string;
  subtitle?: string;
  center?: boolean;
  large?: boolean;
}

export default function SectionHeader({
  script,
  title,
  subtitle,
  center = false,
  large = false,
}: SectionHeaderProps) {
  return (
    <div className={`${styles.wrapper} ${center ? styles.wrapperCenter : ''}`}>
      {script && (
        <div className={`${styles.script} ${large ? styles.scriptLarge : ''}`}>
          {script}
        </div>
      )}
      <h2 className={`${styles.title} ${large ? styles.titleLarge : ''}`}>
        {title}
      </h2>
      {subtitle && (
        <p className={`${styles.subtitle} ${large ? styles.subtitleLarge : ''}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
