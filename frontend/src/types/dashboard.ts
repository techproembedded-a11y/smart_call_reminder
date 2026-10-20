import type { Reminder } from './reminder';

export interface DashboardStats {
  total_reminders: number;
  today_reminders: number;
  emergency_tasks: number;
  overdue_tasks: number;
  upcoming_reminders: number;
  completed_tasks: number;
}

export interface CalendarDayGroup {
  date: string; // YYYY-MM-DD
  count: number;
  has_emergency: boolean;
  has_overdue: boolean;
  reminders: Reminder[];
}
