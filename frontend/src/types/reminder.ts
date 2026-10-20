export type PriorityType = 'emergency' | 'due_today' | '2_day' | '3_day' | '5_day' | 'completed';

export interface Reminder {
  id: number;
  call_record_id?: number | null;
  phone_number?: string | null;
  call_datetime?: string | null;
  task_title: string;
  voice_text?: string | null;
  due_datetime: string;
  timezone: string;
  priority: PriorityType;
  completed: boolean;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReminderCreate {
  phone_number?: string;
  call_datetime?: string;
  call_record_id?: number;
  task_title: string;
  voice_text?: string;
  due_datetime: string;
  timezone?: string;
  priority?: PriorityType;
  auto_priority?: boolean;
}

export interface ReminderUpdate {
  task_title?: string;
  voice_text?: string;
  due_datetime?: string;
  timezone?: string;
  priority?: PriorityType;
  completed?: boolean;
}
