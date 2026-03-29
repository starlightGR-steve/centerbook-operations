/* ═══════════════════════════════════════════
   API Client — cb/v1 REST API

   - Basic Auth via env vars
   - Rate-limited batch queue for bulk operations
   - Response envelope unwrapping
   - Library endpoints use live API
   ═══════════════════════════════════════════ */

import type {
  ApiResponse,
  Notification,
  Student,
  StudentContact,
  Contact,
  LinkedStudent,
  Staff,
  Attendance,
  CheckInRequest,
  CheckOutRequest,
  TimeEntry,
  ClockInRequest,
  ClockOutRequest,
  StudentNote,
  CreateNoteRequest,
  CbTask,
  CreateTaskRequest,
  JournalEntry,
  CreateJournalEntryRequest,
  UpdateJournalEntryRequest,
  ClassroomNote,
  CreateClassroomNoteRequest,
  Book,
  BookLoan,
  CheckoutBookRequest,
  ReturnBookRequest,
  RowAssignment,
  RowAssignmentFlags,
  AssignRowRequest,
  RowTeacher,
  AssignRowTeacherRequest,
  Absence,
  CreateAbsenceRequest,
  LevelHistoryEntry,
  Family,
  PipelineSummary,
  CreateFamilyRequest,
  CenterSettings,
  ScheduleOverride,
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
    list: () => directFetch<Student[]>('/operations/students/all'),
    get: (id: number) => directFetch<Student>(`/students/${id}`),
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
      directFetch<Student[]>('/students/search', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    contacts: (id: number) =>
      directFetch<StudentContact[]>(`/students/${id}/contacts`),
  },

  // ── Contacts ──
  contacts: {
    list: async (): Promise<Contact[]> => {
      const all: Contact[] = [];
      let page = 1;
      while (true) {
        const res = await directFetch<Contact[]>(`/contacts?per_page=200&page=${page}`);
        all.push(...res);
        if (res.length < 200) break;
        page++;
      }
      return all;
    },
    get: (id: number) => directFetch<Contact>(`/contacts/${id}`),
    students: (id: number) => directFetch<LinkedStudent[]>(`/contacts/${id}/students`),
    create: (data: Partial<Contact>) =>
      directFetch<Contact>('/contact', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<Contact>) =>
      directFetch<Contact>(`/contact/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    search: (params: Record<string, string>) =>
      directFetch<Contact[]>('/contacts/search', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
  },

  // ── Student-Contact Links ──
  studentContact: {
    link: (data: { student_id: number; contact_id: number; role?: string }) =>
      directFetch<{ _action: string }>('/student-contact', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    unlink: (data: { student_id: number; contact_id: number }) =>
      directFetch<{ _action: string }>('/student-contact', {
        method: 'DELETE',
        body: JSON.stringify(data),
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
    deactivate: (id: number) =>
      directFetch<{ success: boolean }>(`/staff/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: '0' }),
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
    delete: (id: number) =>
      directFetch<{ deleted: boolean; id: number }>(`/attendance/${id}`, {
        method: 'DELETE',
      }),
    update: (id: number, data: { check_in?: string; check_out?: string | null; session_duration_minutes?: number }) =>
      directFetch<Attendance>(`/attendance/${id}`, {
        method: 'PUT',
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

  // ── Notes (backed by /journal endpoint) ──
  notes: {
    forStudent: async (studentId: number, date?: string): Promise<StudentNote[]> => {
      const entries = await directFetch<JournalEntry[]>(`/journal?student_id=${studentId}`);
      const mapped = entries.map((e): StudentNote => ({
        id: e.id,
        student_id: e.student_id,
        author_type: 'staff',
        author_name: '',
        author_id: e.created_by,
        content: e.content,
        note_date: e.created_at.split(' ')[0].split('T')[0],
        visibility: e.visibility === 'parent_visible' ? 'parent' : e.visibility as 'internal' | 'staff',
        created_at: e.created_at,
      }));
      if (date) return mapped.filter((n) => n.note_date === date);
      return mapped;
    },
    create: async (data: CreateNoteRequest): Promise<StudentNote> => {
      const entry = await directFetch<JournalEntry>('/journal', {
        method: 'POST',
        body: JSON.stringify({
          student_id: data.student_id,
          created_by: data.author_id || 0,
          entry_type: 'general',
          visibility: data.visibility === 'parent' ? 'parent_visible' : (data.visibility || 'staff'),
          content: data.content,
        }),
      });
      return {
        id: entry.id,
        student_id: entry.student_id,
        author_type: data.author_type,
        author_name: data.author_name,
        author_id: entry.created_by,
        content: entry.content,
        note_date: entry.created_at.split(' ')[0].split('T')[0],
        visibility: data.visibility || 'internal',
        created_at: entry.created_at,
      };
    },
    delete: (id: number) =>
      directFetch<void>(`/journal/${id}`, { method: 'DELETE' }),
  },

  // ── Tasks ──
  tasks: {
    forStudent: (studentId: number, status?: string) => {
      const params = new URLSearchParams({ student_id: String(studentId) });
      if (status) params.set('status', status);
      return directFetch<CbTask[]>(`/tasks?${params}`);
    },
    forAssignee: (staffId: number) =>
      directFetch<CbTask[]>(`/tasks?assigned_to=${staffId}`),
    create: (data: CreateTaskRequest) =>
      directFetch<CbTask>('/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<CbTask>) =>
      directFetch<CbTask>(`/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      directFetch<void>(`/tasks/${id}`, { method: 'DELETE' }),
    forCreator: (staffId: number) =>
      directFetch<CbTask[]>(`/tasks?created_by=${staffId}`),
  },

  // ── Journal ──
  journal: {
    forStudent: (studentId: number) =>
      directFetch<JournalEntry[]>(`/journal?student_id=${studentId}`),
    create: (data: CreateJournalEntryRequest) =>
      directFetch<JournalEntry>('/journal', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: UpdateJournalEntryRequest) =>
      directFetch<JournalEntry>(`/journal/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      directFetch<void>(`/journal/${id}`, { method: 'DELETE' }),
  },

  // ── Library ──
  library: {
    books: (): Promise<Book[]> => directFetch<Book[]>('/library/books'),
    createBook: (data: Partial<Book>): Promise<Book> =>
      directFetch<Book>('/library/books', { method: 'POST', body: JSON.stringify(data) }),
    updateBook: (id: number, data: Partial<Book>): Promise<Book> =>
      directFetch<Book>(`/library/books/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    loans: (status?: 'outstanding'): Promise<BookLoan[]> => {
      const qs = status ? `?status=${status}` : '';
      return directFetch<BookLoan[]>(`/library/loans${qs}`);
    },
    checkout: (data: CheckoutBookRequest): Promise<BookLoan> =>
      directFetch<BookLoan>('/library/checkout', { method: 'POST', body: JSON.stringify(data) }),
    returnBook: (data: ReturnBookRequest): Promise<BookLoan> =>
      directFetch<BookLoan>('/library/return', { method: 'POST', body: JSON.stringify(data) }),
  },

  // ── Classroom Config ──
  classroomConfig: {
    get: () => directFetch<{ sections: { id: string; name: string; order: number }[]; rows: { id: string; section_id: string; name: string; seats: number; testing_seats?: number; order: number }[] }>('/classroom/config'),
    save: (config: { sections: { id: string; name: string; order: number }[]; rows: { id: string; section_id: string; name: string; seats: number; testing_seats?: number; order: number }[] }) =>
      directFetch<{ saved: boolean }>('/classroom/config', {
        method: 'POST',
        body: JSON.stringify({ config }),
      }),
  },

  // ── Classroom Assignments ──
  classroom: {
    /** Get all student row assignments for a date */
    assignments: (date?: string) => {
      const d = date || new Date().toISOString().split('T')[0];
      return directFetch<RowAssignment[]>(`/classroom/assignments?date=${d}`);
    },

    /** Upsert a student row assignment */
    assign: (data: AssignRowRequest) =>
      directFetch<RowAssignment>('/classroom/assignments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    /** Remove a student's row assignment for a date */
    unassign: (studentId: number, date?: string) => {
      const d = date || new Date().toISOString().split('T')[0];
      return directFetch<{ deleted: boolean }>(
        `/classroom/assignments/${studentId}?date=${d}`,
        { method: 'DELETE' }
      );
    },

    /** Update flags on a student's row assignment */
    updateFlags: (studentId: number, flags: RowAssignmentFlags, date?: string) => {
      const d = date || new Date().toISOString().split('T')[0];
      return directFetch<RowAssignment>(
        `/classroom/assignments/${studentId}/flags?date=${d}`,
        { method: 'PATCH', body: JSON.stringify({ flags }) }
      );
    },

    /** Get all teacher-to-row assignments for a date */
    teachers: (date?: string) => {
      const d = date || new Date().toISOString().split('T')[0];
      return directFetch<RowTeacher[]>(`/classroom/teachers?date=${d}`);
    },

    /** Upsert a teacher-to-row assignment */
    assignTeacher: (data: AssignRowTeacherRequest) =>
      directFetch<RowTeacher>('/classroom/teachers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // ── Classroom Notes ──
  classroomNotes: {
    forStudent: (studentId: number) =>
      directFetch<ClassroomNote[]>(`/classroom-notes?student_id=${studentId}`),
    create: (data: CreateClassroomNoteRequest) =>
      directFetch<ClassroomNote>('/classroom-notes', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // ── Pipeline / Families ──
  pipeline: {
    summary: () => directFetch<PipelineSummary>('/pipeline/summary'),
    families: (status?: string) => {
      const qs = status ? `?status=${status}` : '';
      return directFetch<Family[]>(`/families${qs}`);
    },
    createFamily: (data: CreateFamilyRequest) =>
      directFetch<Family>('/family', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateFamily: (id: number, data: Partial<Family>) =>
      directFetch<Family>(`/family/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // ── Level History ──
  levelHistory: {
    forStudent: (studentId: number) =>
      directFetch<LevelHistoryEntry[]>(`/students/${studentId}/level-history`),
  },

  // ── Absences ──
  absences: {
    forDate: (date: string) =>
      directFetch<Absence[]>(`/absences?date=${date}`),
    forRange: (from: string, to: string) =>
      directFetch<Absence[]>(`/absences?from=${from}&to=${to}`),
    forStudent: (studentId: number) =>
      directFetch<Absence[]>(`/absences?student_id=${studentId}`),
    create: (data: CreateAbsenceRequest) =>
      directFetch<Absence>('/absences', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<CreateAbsenceRequest>) =>
      directFetch<Absence>(`/absences/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      directFetch<void>(`/absences/${id}`, { method: 'DELETE' }),
  },

  // ── Notifications ──
  notifications: {
    list: (assignedTo: number, status?: string) => {
      const params = new URLSearchParams({ assigned_to: String(assignedTo) });
      if (status) params.append('status', status);
      return directFetch<Notification[]>(`/notifications?${params}`);
    },
    count: (assignedTo: number) =>
      directFetch<{ count: number }>(`/notifications/count?assigned_to=${assignedTo}`),
    create: (data: {
      type: string;
      student_id: number;
      subject?: string;
      level?: string;
      result?: string;
      notes?: string;
      needs_manager_review?: boolean;
    }) =>
      directFetch<{ test_result_id: number; notifications_created: number }>(
        '/notifications',
        { method: 'POST', body: JSON.stringify(data) }
      ),
    update: (id: number, data: {
      status: string;
      review_decision?: string;
      worksheet_instructions?: string;
      review_notes?: string;
    }) =>
      directFetch<Notification>(`/notifications/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // ── Attendance Summary (aggregate) ──
  attendanceSummary: (from: string, to: string) =>
    directFetch<Array<{ date: string; day_name: string; expected: number; attended: number; excused: number; no_show: number; rate: number }>>(
      `/attendance/summary?from=${from}&to=${to}`
    ),

  // ── Level-up milestones ──
  levelUp: (data: { student_id: number; subject: string; old_level: string; new_level: string; send_email: boolean; show_on_portal: boolean }) =>
    directFetch<{ id: number; email_sent: boolean; portal_visible: boolean; _email_to?: string }>('/level-up', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ── Schedule Overrides ──
  scheduleOverrides: {
    list: (weekStart: string, studentId?: number) => {
      const params = new URLSearchParams({ week_start: weekStart });
      if (studentId) params.append('student_id', String(studentId));
      return directFetch<ScheduleOverride[]>(`/schedule-overrides?${params}`);
    },
    create: (data: {
      student_id: number;
      override_type: 'add' | 'remove' | 'move';
      original_day: string | null;
      original_time: number | null;
      new_day: string | null;
      new_time: number | null;
      effective_date: string;
      week_start: string;
      reason: string | null;
    }) =>
      directFetch<ScheduleOverride>('/schedule-overrides', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    remove: (id: number) =>
      directFetch<{ success: boolean; deleted_id: number }>(
        `/schedule-overrides/${id}`,
        { method: 'DELETE' }
      ),
  },

  // ── Persistent Checklist Items ──
  persistentItems: {
    list: (studentId: number) =>
      directFetch<Array<{ id: number; item_key: string; item_type: string; created_by: number; created_at: string }>>(
        `/students/${studentId}/persistent-items`
      ),
    add: (studentId: number, itemKey: string, itemType?: string) =>
      directFetch(`/students/${studentId}/persistent-items`, {
        method: 'POST',
        body: JSON.stringify({ item_key: itemKey, item_type: itemType || 'checklist' }),
      }),
    remove: (studentId: number, itemKey: string) =>
      directFetch(`/students/${studentId}/persistent-items/${itemKey}`, {
        method: 'DELETE',
      }),
  },

  // ── Center Settings ──
  center: {
    settings: () => directFetch<CenterSettings>('/center/settings'),
  },

  // ── Batch utility for bulk operations ──
  batch: {
    fetchStudents: () => batchFetch<Student[]>('/students'),
    fetchStaff: () => batchFetch<Staff[]>('/staff'),
  },
};
