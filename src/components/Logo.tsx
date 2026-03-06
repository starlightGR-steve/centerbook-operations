import styles from './Logo.module.css';

export default function Logo() {
  return (
    <div className={styles.logo}>
      <img
        src="/images/the_center_book_logo_sq_mark_white.svg"
        alt="The Center Book"
        className={styles.mark}
      />
    </div>
  );
}
