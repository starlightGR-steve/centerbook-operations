'use client';

import { BookOpen } from 'lucide-react';
import BookCard from './BookCard';
import EmptyState from '@/components/ui/EmptyState';
import type { Book, BookLoan } from '@/lib/types';
import styles from './BookGrid.module.css';

interface BookGridProps {
  books: Book[];
  loans: BookLoan[];
  onSelect: (book: Book) => void;
}

export default function BookGrid({ books, loans, onSelect }: BookGridProps) {
  return (
    <div className={styles.grid} role="list" aria-label="Library books">
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
        <EmptyState
          icon={BookOpen}
          title="No books found"
          description="Try a different search or add books to get started"
        />
      )}
    </div>
  );
}
