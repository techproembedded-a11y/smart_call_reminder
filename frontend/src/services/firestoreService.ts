import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import type { Reminder, ReminderCreate, ReminderUpdate, PriorityType } from '../types/reminder';
import type { CallRecord, CallRecordCreate } from '../types/call';
import type { DashboardStats, CalendarDayGroup } from '../types/dashboard';

function calculateAutoPriority(dueStr: string): PriorityType {
  const due = new Date(dueStr).getTime();
  const now = Date.now();
  const diffDays = (due - now) / (1000 * 60 * 60 * 24);

  if (diffDays <= 1.0) return 'due_today';
  if (diffDays <= 2.0) return '2_day';
  if (diffDays <= 3.0) return '3_day';
  return '5_day';
}

function getDbOrThrow() {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase Firestore is not initialized. Please configure Firebase in Settings.');
  }
  return db;
}

export const firestoreService = {
  // ===================== REMINDERS =====================
  async getReminders(params: {
    priority?: string;
    completed?: boolean;
    due_date?: string;
    phone?: string;
    search?: string;
    skip?: number;
    limit?: number;
  } = {}): Promise<Reminder[]> {
    const db = getDbOrThrow();
    const remindersRef = collection(db, 'reminders');
    const q = query(remindersRef, orderBy('created_at', 'desc'));
    const snapshot = await getDocs(q);

    let reminders: Reminder[] = [];
    snapshot.forEach((d) => {
      reminders.push(d.data() as Reminder);
    });

    // Client-side filtering
    if (params.priority) {
      const p = params.priority.toLowerCase();
      reminders = reminders.filter((r) => r.priority.toLowerCase() === p);
    }
    if (params.completed !== undefined) {
      reminders = reminders.filter((r) => r.completed === params.completed);
    }
    if (params.due_date) {
      const targetDate = params.due_date.trim();
      reminders = reminders.filter((r) => r.due_datetime && r.due_datetime.startsWith(targetDate));
    }
    if (params.phone) {
      const p = params.phone.trim();
      reminders = reminders.filter((r) => r.phone_number && r.phone_number.includes(p));
    }
    if (params.search) {
      const term = params.search.toLowerCase().trim();
      reminders = reminders.filter((r) =>
        (r.task_title && r.task_title.toLowerCase().includes(term)) ||
        (r.voice_text && r.voice_text.toLowerCase().includes(term)) ||
        (r.phone_number && r.phone_number.includes(term))
      );
    }

    const skip = params.skip || 0;
    const limit = params.limit || 100;
    return reminders.slice(skip, skip + limit);
  },

  async createReminder(payload: ReminderCreate): Promise<Reminder> {
    const db = getDbOrThrow();
    const nowIso = new Date().toISOString();
    const id = Date.now() + Math.floor(Math.random() * 1000);

    let priority: PriorityType = payload.priority || 'due_today';
    if (payload.auto_priority) {
      priority = calculateAutoPriority(payload.due_datetime);
    }

    let callRecordId = payload.call_record_id || null;
    let phoneNumber = payload.phone_number || null;
    let callDatetime = payload.call_datetime || null;

    // Auto-create Call Record if phone is provided
    if (phoneNumber && !callRecordId) {
      const call = await this.createCall({
        phone_number: phoneNumber,
        call_datetime: callDatetime || nowIso,
      });
      callRecordId = call.id;
    }

    const newReminder: Reminder = {
      id,
      call_record_id: callRecordId,
      phone_number: phoneNumber,
      call_datetime: callDatetime,
      task_title: payload.task_title.trim(),
      voice_text: payload.voice_text ? payload.voice_text.trim() : null,
      due_datetime: payload.due_datetime,
      timezone: payload.timezone || 'Asia/Kolkata',
      priority,
      completed: false,
      completed_at: null,
      created_at: nowIso,
      updated_at: nowIso,
    };

    const docRef = doc(db, 'reminders', String(id));
    await setDoc(docRef, newReminder);
    return newReminder;
  },

  async getReminder(id: number): Promise<Reminder> {
    const db = getDbOrThrow();
    const docRef = doc(db, 'reminders', String(id));
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error(`Reminder ${id} not found in Firestore`);
    }
    return snap.data() as Reminder;
  },

  async updateReminder(id: number, payload: ReminderUpdate): Promise<Reminder> {
    const db = getDbOrThrow();
    const docRef = doc(db, 'reminders', String(id));
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error(`Reminder ${id} not found`);
    }

    const existing = snap.data() as Reminder;
    const nowIso = new Date().toISOString();

    const updated: Reminder = {
      ...existing,
      ...payload,
      updated_at: nowIso,
    };

    if (payload.completed !== undefined) {
      updated.completed = payload.completed;
      updated.completed_at = payload.completed ? nowIso : null;
    }

    await updateDoc(docRef, updated as any);
    return updated;
  },

  async completeReminder(id: number): Promise<Reminder> {
    return this.updateReminder(id, { completed: true });
  },

  async deleteReminder(id: number): Promise<void> {
    const db = getDbOrThrow();
    const docRef = doc(db, 'reminders', String(id));
    await deleteDoc(docRef);
  },

  // ===================== CALLS =====================
  async getCalls(params: { phone?: string; skip?: number; limit?: number } = {}): Promise<CallRecord[]> {
    const db = getDbOrThrow();
    const callsRef = collection(db, 'calls');
    const q = query(callsRef, orderBy('created_at', 'desc'));
    const snapshot = await getDocs(q);

    let calls: CallRecord[] = [];
    snapshot.forEach((d) => {
      calls.push(d.data() as CallRecord);
    });

    if (params.phone) {
      const p = params.phone.trim();
      calls = calls.filter((c) => c.phone_number.includes(p));
    }

    const skip = params.skip || 0;
    const limit = params.limit || 100;
    return calls.slice(skip, skip + limit);
  },

  async createCall(payload: CallRecordCreate): Promise<CallRecord> {
    const db = getDbOrThrow();
    const nowIso = new Date().toISOString();
    const id = Date.now() + Math.floor(Math.random() * 1000);

    const newCall: CallRecord = {
      id,
      phone_number: payload.phone_number.trim(),
      call_datetime: payload.call_datetime || nowIso,
      created_at: nowIso,
      updated_at: nowIso,
      reminders: [],
    };

    const docRef = doc(db, 'calls', String(id));
    await setDoc(docRef, newCall);
    return newCall;
  },

  async getCall(id: number): Promise<CallRecord> {
    const db = getDbOrThrow();
    const docRef = doc(db, 'calls', String(id));
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error(`Call record ${id} not found`);
    }
    return snap.data() as CallRecord;
  },

  async updateCall(id: number, payload: Partial<CallRecordCreate>): Promise<CallRecord> {
    const db = getDbOrThrow();
    const docRef = doc(db, 'calls', String(id));
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error(`Call record ${id} not found`);
    }

    const existing = snap.data() as CallRecord;
    const updated: CallRecord = {
      ...existing,
      ...payload,
      updated_at: new Date().toISOString(),
    };

    await updateDoc(docRef, updated as any);
    return updated;
  },

  async deleteCall(id: number): Promise<void> {
    const db = getDbOrThrow();
    const docRef = doc(db, 'calls', String(id));
    await deleteDoc(docRef);
  },

  // ===================== DASHBOARD & STATS =====================
  async getDashboardStats(): Promise<DashboardStats> {
    const reminders = await this.getReminders();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    let total_reminders = reminders.length;
    let today_reminders = 0;
    let emergency_tasks = 0;
    let overdue_tasks = 0;
    let upcoming_reminders = 0;
    let completed_tasks = 0;

    for (const r of reminders) {
      if (r.completed) {
        completed_tasks++;
        continue;
      }

      if (r.priority === 'emergency') {
        emergency_tasks++;
      }

      const dueDate = new Date(r.due_datetime);
      const dueDayStr = r.due_datetime.split('T')[0];

      if (dueDayStr === todayStr) {
        today_reminders++;
      }

      if (dueDate < now) {
        overdue_tasks++;
      } else {
        upcoming_reminders++;
      }
    }

    return {
      total_reminders,
      today_reminders,
      emergency_tasks,
      overdue_tasks,
      upcoming_reminders,
      completed_tasks,
    };
  },

  async getCalendar(month: string): Promise<CalendarDayGroup[]> {
    // month is "YYYY-MM"
    const reminders = await this.getReminders();
    const now = new Date();

    const map = new Map<string, Reminder[]>();

    for (const r of reminders) {
      if (!r.due_datetime) continue;
      const day = r.due_datetime.split('T')[0];
      if (month && !day.startsWith(month)) continue;

      const list = map.get(day) || [];
      list.push(r);
      map.set(day, list);
    }

    const groups: CalendarDayGroup[] = [];
    map.forEach((rems, day) => {
      const has_emergency = rems.some((r) => r.priority === 'emergency' && !r.completed);
      const has_overdue = rems.some((r) => new Date(r.due_datetime) < now && !r.completed);
      groups.push({
        date: day,
        count: rems.length,
        has_emergency,
        has_overdue,
        reminders: rems,
      });
    });

    groups.sort((a, b) => a.date.localeCompare(b.date));
    return groups;
  },
};
