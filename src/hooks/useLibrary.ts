import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import { MOCK_BOOKS, MOCK_BOOK_LOANS, MOCK_STUDENTS } from '@/lib/mock-data';
import { useDemoMode, isDemoModeActive } from '@/context/MockDataContext';
import type { Book, BookLoan, CheckoutBookRequest, ReturnBookRequest } from '@/lib/types';

/** Fetch all library books */
export function useBooks() {
  const { isDemoMode } = useDemoMode();

  return useSWR<Book[]>(
    isDemoMode ? 'demo-library-books' : 'library-books',
    async () => {
      if (isDemoMode) return MOCK_BOOKS;
      return api.library.books();
    },
    { dedupingInterval: isDemoMode ? 60000 : 5000, revalidateOnFocus: !isDemoMode }
  );
}

/** Fetch outstanding loans */
export function useOutstandingLoans() {
  const { isDemoMode } = useDemoMode();

  return useSWR<BookLoan[]>(
    isDemoMode ? 'demo-library-loans-outstanding' : 'library-loans-outstanding',
    async () => {
      if (isDemoMode) {
        return MOCK_BOOK_LOANS
          .filter((l) => l.returned_at === null)
          .map((l) => ({
            ...l,
            book: MOCK_BOOKS.find((b) => b.id === l.book_id),
            student: MOCK_STUDENTS.find((s) => s.id === l.student_id),
          }));
      }
      return api.library.loans('outstanding');
    },
    { dedupingInterval: isDemoMode ? 60000 : 5000, revalidateOnFocus: !isDemoMode }
  );
}

/** Fetch all loans, optionally filtered by book */
export function useBookLoans(bookId?: number) {
  const { isDemoMode } = useDemoMode();

  return useSWR<BookLoan[]>(
    isDemoMode
      ? (bookId ? `demo-library-loans-book-${bookId}` : 'demo-library-loans-all')
      : (bookId ? `library-loans-book-${bookId}` : 'library-loans-all'),
    async () => {
      if (isDemoMode) {
        const loans = bookId
          ? MOCK_BOOK_LOANS.filter((l) => l.book_id === bookId)
          : MOCK_BOOK_LOANS;
        return loans.map((l) => ({
          ...l,
          book: MOCK_BOOKS.find((b) => b.id === l.book_id),
          student: MOCK_STUDENTS.find((s) => s.id === l.student_id),
        }));
      }
      return api.library.loans();
    },
    { dedupingInterval: isDemoMode ? 60000 : 5000, revalidateOnFocus: !isDemoMode }
  );
}

function revalidateAll() {
  if (isDemoModeActive()) {
    mutate('demo-library-books');
    mutate('demo-library-loans-outstanding');
    mutate((key: string) => typeof key === 'string' && key.startsWith('demo-library-loans-'), undefined, { revalidate: true });
    return;
  }
  mutate('library-books');
  mutate('library-loans-outstanding');
  mutate((key: string) => typeof key === 'string' && key.startsWith('library-loans-'), undefined, { revalidate: true });
}

/** Checkout a book */
export async function checkoutBook(data: CheckoutBookRequest): Promise<BookLoan> {
  if (isDemoModeActive()) {
    revalidateAll();
    return { id: Date.now(), book_id: data.book_id, student_id: data.student_id, checked_out_at: new Date().toISOString(), due_date: null, returned_at: null, checked_out_by: data.checked_out_by || null, returned_to: null, created_at: new Date().toISOString() };
  }
  const result = await api.library.checkout(data);
  revalidateAll();
  return result;
}

/** Return a book */
export async function returnBook(data: ReturnBookRequest): Promise<BookLoan> {
  if (isDemoModeActive()) {
    revalidateAll();
    return { id: Date.now(), book_id: data.book_id, student_id: 0, checked_out_at: new Date().toISOString(), due_date: null, returned_at: new Date().toISOString(), checked_out_by: null, returned_to: data.returned_to || null, created_at: new Date().toISOString() };
  }
  const result = await api.library.returnBook(data);
  revalidateAll();
  return result;
}

/** Add a new book to inventory */
export async function addBook(data: Partial<Book>): Promise<Book> {
  if (isDemoModeActive()) {
    revalidateAll();
    return { id: Date.now(), title: data.title || '', author: data.author || null, isbn: data.isbn || null, barcode: data.barcode || null, category: data.category || null, reading_level: data.reading_level || null, status: 'available', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  }
  const result = await api.library.createBook(data);
  revalidateAll();
  return result;
}
