import useSWR, { mutate } from 'swr';
import { api, USE_MOCK } from '@/lib/api';
import { MOCK_BOOKS, MOCK_BOOK_LOANS, MOCK_STUDENTS } from '@/lib/mock-data';
import type { Book, BookLoan, CheckoutBookRequest, ReturnBookRequest } from '@/lib/types';

/** In-memory mock stores */
let mockBooks: Book[] = [...MOCK_BOOKS];
let mockLoans: BookLoan[] = [...MOCK_BOOK_LOANS];

/** Fetch all library books */
export function useBooks() {
  return useSWR<Book[]>(
    'library-books',
    async () => {
      if (USE_MOCK) return mockBooks;
      return api.library.books();
    },
    { dedupingInterval: 5000 }
  );
}

/** Fetch outstanding loans */
export function useOutstandingLoans() {
  return useSWR<BookLoan[]>(
    'library-loans-outstanding',
    async () => {
      if (USE_MOCK) {
        return mockLoans
          .filter((l) => l.returned_at === null)
          .map((l) => ({
            ...l,
            book: mockBooks.find((b) => b.id === l.book_id),
            student: MOCK_STUDENTS.find((s) => s.id === l.student_id),
          }));
      }
      return api.library.loans('outstanding');
    },
    { dedupingInterval: 5000 }
  );
}

/** Fetch all loans, optionally filtered by book */
export function useBookLoans(bookId?: number) {
  return useSWR<BookLoan[]>(
    bookId ? `library-loans-book-${bookId}` : 'library-loans-all',
    async () => {
      if (USE_MOCK) {
        let loans = mockLoans;
        if (bookId) loans = loans.filter((l) => l.book_id === bookId);
        return loans.map((l) => ({
          ...l,
          book: mockBooks.find((b) => b.id === l.book_id),
          student: MOCK_STUDENTS.find((s) => s.id === l.student_id),
        }));
      }
      return api.library.loans();
    },
    { dedupingInterval: 5000 }
  );
}

function revalidateAll() {
  mutate('library-books');
  mutate('library-loans-outstanding');
  mutate((key: string) => typeof key === 'string' && key.startsWith('library-loans-'), undefined, { revalidate: true });
}

/** Checkout a book */
export async function checkoutBook(data: CheckoutBookRequest): Promise<BookLoan> {
  if (USE_MOCK) {
    const loan: BookLoan = {
      id: Date.now(),
      book_id: data.book_id,
      student_id: data.student_id,
      checked_out_at: new Date().toISOString(),
      due_date: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        return d.toISOString().split('T')[0];
      })(),
      returned_at: null,
      checked_out_by: data.checked_out_by ?? null,
      returned_to: null,
      created_at: new Date().toISOString(),
    };
    mockLoans.push(loan);
    // Update book status
    const book = mockBooks.find((b) => b.id === data.book_id);
    if (book) book.status = 'checked-out';
    revalidateAll();
    return loan;
  }
  const result = await api.library.checkout(data);
  revalidateAll();
  return result;
}

/** Return a book */
export async function returnBook(data: ReturnBookRequest): Promise<BookLoan> {
  if (USE_MOCK) {
    const existing = mockLoans.find(
      (l) => l.book_id === data.book_id && l.returned_at === null
    );
    if (existing) {
      existing.returned_at = new Date().toISOString();
      existing.returned_to = data.returned_to ?? null;
    }
    // Update book status
    const book = mockBooks.find((b) => b.id === data.book_id);
    if (book) book.status = 'available';
    revalidateAll();
    return existing || ({} as BookLoan);
  }
  const result = await api.library.returnBook(data);
  revalidateAll();
  return result;
}

/** Add a new book to inventory */
export async function addBook(data: Partial<Book>): Promise<Book> {
  const book: Book = {
    id: Date.now(),
    title: data.title || 'Untitled',
    author: data.author || null,
    isbn: data.isbn || null,
    barcode: data.barcode || null,
    category: data.category || null,
    reading_level: data.reading_level || null,
    status: 'available',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (USE_MOCK) {
    mockBooks.push(book);
    revalidateAll();
    return book;
  }
  const result = await api.library.createBook(data);
  revalidateAll();
  return result;
}
