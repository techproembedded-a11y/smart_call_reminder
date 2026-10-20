export interface CallRecord {
  id: number;
  phone_number: string;
  call_datetime: string;
  created_at: string;
  updated_at: string;
  reminders?: {
    id: number;
    task_title: string;
    due_datetime: string;
    priority: string;
    completed: boolean;
  }[];
}

export interface CallRecordCreate {
  phone_number: string;
  call_datetime?: string;
}
