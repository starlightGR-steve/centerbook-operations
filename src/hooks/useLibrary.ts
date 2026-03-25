import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import type { Book, BookLoan, CheckoutBookRequest, ReturnBookRequest } from '@/lib/types';

/** Fetch all library books */
export function useBooks() {
  return useSWR<Book[]>(
    'library-books',
    async () => {
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
  const result = await api.library.checkout(data);
  revalidateAll();
  return result;
}

/** Return a book */
export async function returnBook(data: ReturnBookRequest): Promise<BookLoan> {
  const result = await api.library.returnBook(data);
  revalidateAll();
  return result;
}

/** Add a new book to inventory */
export async function addBook(data: Partial<Book>): Promise<Book> {
  const result = await api.library.createBook(data);
  revalidateAll();
  return result;
}
