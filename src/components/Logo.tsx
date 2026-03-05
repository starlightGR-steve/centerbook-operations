import styles from './Logo.module.css';

export default function Logo() {
  return (
    <div className={styles.logo}>
      <div className={styles.monogram}>CB</div>
      <div className={styles.textWrap}>
        <span className={styles.the}>the</span>
        <span className={styles.name}>CENTER BOOK</span>
      </div>
    </div>
  );
}
