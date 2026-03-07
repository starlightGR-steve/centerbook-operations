/* ═══════════════════════════════════════════
   API Client — cb/v1 REST API

   - Basic Auth via env vars
   - Mock toggle via NEXT_PUBLIC_USE_MOCK
   - Rate-limited batch queue for bulk operations
   - Response envelope unwrapping
   ═══════════════════════════════════════════ */

import type {
  ApiResponse,
  Student,
  Contact,
  Staff,
  Attendance,
  CheckInRequest,
  CheckOutRequest,
  TimeEntry,
  ClockInRequest,
  ClockOutRequest,
  StudentNote,
  CreateNoteRequest,
  Book,
  BookLoan,
  CheckoutBookRequest,
  ReturnBookRequest,
  RowAssignment,
  AssignRowRequest,
} from './types';

// ── Configuration ──────────────────────────

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  'https://thecenterbook1.wpenginepowered.com/wp-json/cb/v1';

const API_USER = process.env.NEXT_PUBLIC_API_USER || '';
const API_PASS = process.env.NEXT_PUBLIC_API_PASS || '';

// ── Rate Limiter ───────────────────────────
// WP Engine Cloudflare WAF: batch 2 requests, 2s between batches

interface QueuedRequest<T = unknown> {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

class RateLimitedQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private batchSize = 2;
  private intervalMs = 2000;

  async enqueue<T>(request: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        execute: request as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize);
      const results = await Promise.allSettled(
        batch.map((item) => item.execute())
      );

      results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          batch[i].resolve(result.value);
        } else {
          batch[i].reject(result.reason);
        }
      });

      if (this.queue.length > 0) {
        await new Promise((r) => setTimeout(r, this.intervalMs));
      }
    }

    this.processing = false;
  }
}

const rateLimitQueue = new RateLimitedQueue();

// ── Base Fetch ─────────────────────────────

export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function baseFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const auth = btoa(`${API_USER}:${API_PASS}`);

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new ApiClientError(res.status, `API ${res.status}: ${text}`);
  }

  const json = await res.json();

  // Unwrap { success: true, data: T } envelope
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    if (!json.success) {
      throw new ApiClientError(400, json.message || 'API returned success: false');
    }
    return json.data as T;
  }

  // Some endpoints may return raw data
  return json as T;
}

/** Rate-limited fetch for bulk operations (multiple sequential calls) */
function batchFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  return rateLimitQueue.enqueue(() => baseFetch<T>(endpoint, options));
}

/** Direct fetch for single real-time operations (no queue delay) */
function directFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  return baseFetch<T>(endpoint, options);
}

// ── API Methods ────────────────────────────
// All methods use directFetch for single operations.
// Use batchFetch only when doing bulk reads/writes in loops.

export const api = {
  // ── Students ──
  students: {
    list: () => directFetch<Student[]>('/student'),
    get: (id: number) => directFetch<Student>(`/student/${id}`),
    create: (data: Partial<Student>) =>
      directFetch<Student>('/student', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<Student>) =>
      directFetch<Student>(`/student/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    search: (params: Record<string, string>) =>
      directFetch<Student[]>('/student/search', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
  },

  // ── Contacts ──
  contacts: {
    list: () => directFetch<Contact[]>('/contact'),
    get: (id: number) => directFetch<Contact>(`/contact/${id}`),
    search: (params: Record<string, string>) =>
      directFetch<Contact[]>('/contact/search', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
  },

  // ── Staff ──
  staff: {
    list: () => directFetch<Staff[]>('/staff'),
    get: (id: number) => directFetch<Staff>(`/staff/${id}`),
    create: (data: Partial<Staff>) =>
      directFetch<Staff>('/staff', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<Staff>) =>
      directFetch<Staff>(`/staff/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // ── Attendance (Kiosk) ──
  attendance: {
    today: (date?: string) => {
      const d = date || new Date().toISOString().split('T')[0];
      return directFetch<Attendance[]>(`/attendance?date=${d}`);
    },
    forStudent: (studentId: number, from?: string, to?: string) => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString();
      return directFetch<Attendance[]>(
        `/attendance/student/${studentId}${qs ? `?${qs}` : ''}`
      );
    },
    checkIn: (data: CheckInRequest) =>
      directFetch<Attendance>('/attendance/checkin', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    checkOut: (data: CheckOutRequest) =>
      directFetch<Attendance>('/attendance/checkout', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // ── Timeclock (Staff) ──
  timeclock: {
    today: (date?: string) => {
      const d = date || new Date().toISOString().split('T')[0];
      return directFetch<TimeEntry[]>(`/timeclock?date=${d}`);
    },
    forStaff: (staffId: number, from?: string, to?: string) => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString();
      return directFetch<TimeEntry[]>(
        `/timeclock/staff/${staffId}${qs ? `?${qs}` : ''}`
      );
    },
    clockIn: (data: ClockInRequest) =>
      directFetch<TimeEntry>('/timeclock/in', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    clockOut: (data: ClockOutRequest) =>
      directFetch<TimeEntry>('/timeclock/out', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // ── Notes ──
  notes: {
    forStudent: (studentId: number, date?: string) => {
      const qs = date ? `?date=${date}` : '';
      return directFetch<StudentNote[]>(`/note/student/${studentId}${qs}`);
    },
    create: (data: CreateNoteRequest) =>
      directFetch<StudentNote>('/note', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      directFetch<void>(`/note/${id}`, { method: 'DELETE' }),
  },

  // ── Library ──
  library: {
    books: () => directFetch<Book[]>('/library/book'),
    createBook: (data: Partial<Book>) =>
      directFetch<Book>('/library/book', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateBook: (id: number, data: Partial<Book>) =>
      directFetch<Book>(`/library/book/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    loans: (status?: 'outstanding') => {
      const qs = status ? `?status=${status}` : '';
      return directFetch<BookLoan[]>(`/library/loans${qs}`);
    },
    checkout: (data: CheckoutBookRequest) =>
      directFetch<BookLoan>('/library/checkout', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    returnBook: (data: ReturnBookRequest) =>
      directFetch<BookLoan>('/library/return', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // ── Row Assignments ──
  rows: {
    forRow: (rowNumber: number, date?: string) => {
      const d = date || new Date().toISOString().split('T')[0];
      return directFetch<RowAssignment[]>(
        `/row?number=${rowNumber}&date=${d}`
      );
    },
    assign: (data: AssignRowRequest) =>
      directFetch<RowAssignment>('/row/assign', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    remove: (id: number) =>
      directFetch<void>(`/row/assign/${id}`, { method: 'DELETE' }),
  },

  // ── Batch utility for bulk operations ──
  batch: {
    fetchStudents: () => batchFetch<Student[]>('/student'),
    fetchStaff: () => batchFetch<Staff[]>('/staff'),
  },
};
