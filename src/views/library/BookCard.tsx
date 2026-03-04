'use client';

import { BookOpen } from 'lucide-react';
import type { Book, BookLoan } from '@/lib/types';
import styles from './BookCard.module.css';

interface BookCardProps {
  book: Book;
  loan?: BookLoan | null;
  onClick: () => void;
}

export default function BookCard({ book, loan, onClick }: BookCardProps) {
  const isCheckedOut = book.status === 'checked-out';

  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.iconWrap}>
        <BookOpen size={18} />
      </div>
      <h3 className={styles.title}>{book.title}</h3>
      {book.author && <p className={styles.author}>{book.author}</p>}
      {(book.category || book.reading_level) && (
        <p className={styles.meta}>
          {book.category}
          {book.category && book.reading_level && ' · '}
          {book.reading_level && `Level ${book.reading_level}`}
        </p>
      )}
      <div className={styles.divider} />
      <div className={styles.statusRow}>
        <span className={isCheckedOut ? styles.statusOut : styles.statusAvail}>
          {isCheckedOut ? 'Checked Out' : 'Available'}
        </span>
        {isCheckedOut && loan?.student && (
          <span className={styles.borrower}>
            {loan.student.first_name} {loan.student.last_name[0]}.
          </span>
        )}
      </div>
    </div>
  );
}
