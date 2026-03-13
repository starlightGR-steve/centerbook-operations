'use client';

import { BookOpen, KeyRound } from 'lucide-react';
import type { Book, BookLoan } from '@/lib/types';
import styles from './BookCard.module.css';

interface BookCardProps {
  book: Book;
  loan?: BookLoan | null;
  onClick: () => void;
}

export default function BookCard({ book, loan, onClick }: BookCardProps) {
  const isCheckedOut = book.status === 'checked-out';
  const isAnswerKey = book.type === 'answer_key';

  return (
    <div
      className={`${styles.card} ${isAnswerKey ? styles.cardAnswerKey : ''}`}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      tabIndex={0}
      role="button"
      aria-label={`${book.title}${book.author ? ` by ${book.author}` : ''}, ${isCheckedOut ? 'Checked out' : 'Available'}`}
    >
      <div className={isAnswerKey ? styles.iconWrapKey : styles.iconWrap}>
        {isAnswerKey ? <KeyRound size={18} /> : <BookOpen size={18} />}
      </div>
      <h3 className={styles.title}>{book.title}</h3>
      {isAnswerKey ? (
        <p className={styles.answerKeyLabel}>Answer Key</p>
      ) : (
        book.author && <p className={styles.author}>{book.author}</p>
      )}
      {(book.category || book.reading_level) && (
        <p className={styles.meta}>
          {!isAnswerKey && book.category}
          {!isAnswerKey && book.category && book.reading_level && ' · '}
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
