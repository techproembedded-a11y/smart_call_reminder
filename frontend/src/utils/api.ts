import type { CallRecord, CallRecordCreate } from '../types/call';
import type { Reminder, ReminderCreate, ReminderUpdate } from '../types/reminder';
import type { DashboardStats, CalendarDayGroup } from '../types/dashboard';
import { isFirebaseConfigured } from '../services/firebase';
import { firestoreService } from '../services/firestoreService';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get('content-type');
  let data: any = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = data?.detail || data?.message || response.statusText || 'Request failed';
    throw new ApiError(errorMsg, response.status, data);
  }

  return data as T;
}

export const api = {
  // Health
  getHealth: () => request<{ status: string; app: string }>('/health'),

  // Dashboard & Calendar
  getDashboardStats: async () => {
    if (isFirebaseConfigured()) {
      return firestoreService.getDashboardStats();
    }
    return request<DashboardStats>('/dashboard/stats');
  },
  getCalendar: async (month: string) => {
    if (isFirebaseConfigured()) {
      return firestoreService.getCalendar(month);
    }
    return request<CalendarDayGroup[]>(`/dashboard/calendar?month=${encodeURIComponent(month)}`);
  },

  // Calls
  getCalls: async (params: { phone?: string; skip?: number; limit?: number } = {}) => {
    if (isFirebaseConfigured()) {
      return firestoreService.getCalls(params);
    }
    const q = new URLSearchParams();
    if (params.phone) q.set('phone', params.phone);
    if (params.skip !== undefined) q.set('skip', String(params.skip));
    if (params.limit !== undefined) q.set('limit', String(params.limit));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request<CallRecord[]>(`/calls${qs}`);
  },
  createCall: async (payload: CallRecordCreate) => {
    if (isFirebaseConfigured()) {
      return firestoreService.createCall(payload);
    }
    return request<CallRecord>('/calls', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getCall: async (id: number) => {
    if (isFirebaseConfigured()) {
      return firestoreService.getCall(id);
    }
    return request<CallRecord>(`/calls/${id}`);
  },
  updateCall: async (id: number, payload: Partial<CallRecordCreate>) => {
    if (isFirebaseConfigured()) {
      return firestoreService.updateCall(id, payload);
    }
    return request<CallRecord>(`/calls/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  deleteCall: async (id: number) => {
    if (isFirebaseConfigured()) {
      return firestoreService.deleteCall(id);
    }
    return request<void>(`/calls/${id}`, {
      method: 'DELETE',
    });
  },

  // Reminders
  getReminders: async (params: {
    priority?: string;
    completed?: boolean;
    due_date?: string;
    phone?: string;
    search?: string;
    skip?: number;
    limit?: number;
  } = {}) => {
    if (isFirebaseConfigured()) {
      return firestoreService.getReminders(params);
    }
    const q = new URLSearchParams();
    if (params.priority) q.set('priority', params.priority);
    if (params.completed !== undefined) q.set('completed', String(params.completed));
    if (params.due_date) q.set('due_date', params.due_date);
    if (params.phone) q.set('phone', params.phone);
    if (params.search) q.set('search', params.search);
    if (params.skip !== undefined) q.set('skip', String(params.skip));
    if (params.limit !== undefined) q.set('limit', String(params.limit));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request<Reminder[]>(`/reminders${qs}`);
  },
  createReminder: async (payload: ReminderCreate) => {
    if (isFirebaseConfigured()) {
      return firestoreService.createReminder(payload);
    }
    return request<Reminder>('/reminders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getReminder: async (id: number) => {
    if (isFirebaseConfigured()) {
      return firestoreService.getReminder(id);
    }
    return request<Reminder>(`/reminders/${id}`);
  },
  updateReminder: async (id: number, payload: ReminderUpdate) => {
    if (isFirebaseConfigured()) {
      return firestoreService.updateReminder(id, payload);
    }
    return request<Reminder>(`/reminders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  completeReminder: async (id: number) => {
    if (isFirebaseConfigured()) {
      return firestoreService.completeReminder(id);
    }
    return request<Reminder>(`/reminders/${id}/complete`, {
      method: 'POST',
    });
  },
  deleteReminder: async (id: number) => {
    if (isFirebaseConfigured()) {
      return firestoreService.deleteReminder(id);
    }
    return request<void>(`/reminders/${id}`, {
      method: 'DELETE',
    });
  },

  // Voice & Transcription (Always processed on backend via Groq Whisper)
  transcribeAudio: (formData: FormData) =>
    request<{
      text: string;
      provider: string;
      language?: string;
      duration_seconds?: number;
      message?: string;
    }>('/transcription', {
      method: 'POST',
      body: formData,
    }),
  extractReminder: (payload: {
    transcript: string;
    phone_number?: string;
    call_datetime?: string;
    timezone?: string;
  }) =>
    request<{
      task_title: string;
      phone_number?: string;
      due_datetime: string;
      priority: string;
      confidence: number;
      notes?: string;
      explanation?: string;
    }>('/extract-reminder', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Notifications & Web Push
  getVapidPublicKey: () => request<{ public_key: string }>('/notifications/vapid-public-key'),
  subscribePush: (payload: { endpoint: string; keys: { p256dh: string; auth: string }; user_agent?: string }) =>
    request<{ id: number; subscription_endpoint: string }>('/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  unsubscribePush: (payload: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
    request<{ status: string }>('/notifications/subscribe', {
      method: 'DELETE',
      body: JSON.stringify(payload),
    }),
  sendTestNotification: (payload: { title?: string; body?: string }) =>
    request<{ success: boolean; dispatched: number; total_subscriptions: number; message?: string }>('/notifications/test', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
