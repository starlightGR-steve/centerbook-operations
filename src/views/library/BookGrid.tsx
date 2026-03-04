'use client';

import BookCard from './BookCard';
import type { Book, BookLoan } from '@/lib/types';
import styles from './BookGrid.module.css';

interface BookGridProps {
  books: Book[];
  loans: BookLoan[];
  onSelect: (book: Book) => void;
}

export default function BookGrid({ books, loans, onSelect }: BookGridProps) {
  return (
    <div className={styles.grid}>
      {books.map((book) => {
        const loan = loans.find(
          (l) => l.book_id === book.id && l.returned_at === null
        );
        return (
          <BookCard
            key={book.id}
            book={book}
            loan={loan}
            onClick={() => onSelect(book)}
          />
        );
      })}
      {books.length === 0 && (
        <div className={styles.empty}>No books found</div>
      )}
    </div>
  );
}
