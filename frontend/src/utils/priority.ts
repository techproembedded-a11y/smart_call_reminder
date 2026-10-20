import type { PriorityType } from '../types/reminder';

export interface PriorityConfig {
  key: PriorityType;
  label: string;
  shortLabel: string;
  colorHex: string;
  badgeBg: string;
  badgeText: string;
  borderLeft: string;
  dotBg: string;
  hoverBg: string;
  daysLead: number;
}

export const PRIORITY_MAP: Record<PriorityType, PriorityConfig> = {
  emergency: {
    key: 'emergency',
    label: 'Emergency',
    shortLabel: 'Emergency',
    colorHex: '#DC2626',
    badgeBg: 'bg-red-100 dark:bg-red-950/60',
    badgeText: 'text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900',
    borderLeft: 'border-l-4 border-l-red-600',
    dotBg: 'bg-red-600',
    hoverBg: 'hover:border-red-500',
    daysLead: 0,
  },
  due_today: {
    key: 'due_today',
    label: 'Due Today / 1-Day',
    shortLabel: 'Today',
    colorHex: '#EA580C',
    badgeBg: 'bg-orange-100 dark:bg-orange-950/60',
    badgeText: 'text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-900',
    borderLeft: 'border-l-4 border-l-orange-600',
    dotBg: 'bg-orange-600',
    hoverBg: 'hover:border-orange-500',
    daysLead: 1,
  },
  '2_day': {
    key: '2_day',
    label: '2-Day Reminder',
    shortLabel: '2 Days',
    colorHex: '#F59E0B',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/60',
    badgeText: 'text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900',
    borderLeft: 'border-l-4 border-l-amber-500',
    dotBg: 'bg-amber-500',
    hoverBg: 'hover:border-amber-500',
    daysLead: 2,
  },
  '3_day': {
    key: '3_day',
    label: '3-Day Reminder',
    shortLabel: '3 Days',
    colorHex: '#EAB308',
    badgeBg: 'bg-yellow-100 dark:bg-yellow-950/60',
    badgeText: 'text-yellow-800 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900',
    borderLeft: 'border-l-4 border-l-yellow-500',
    dotBg: 'bg-yellow-500',
    hoverBg: 'hover:border-yellow-500',
    daysLead: 3,
  },
  '5_day': {
    key: '5_day',
    label: '5-Day Reminder',
    shortLabel: '5 Days',
    colorHex: '#2563EB',
    badgeBg: 'bg-blue-100 dark:bg-blue-950/60',
    badgeText: 'text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900',
    borderLeft: 'border-l-4 border-l-blue-600',
    dotBg: 'bg-blue-600',
    hoverBg: 'hover:border-blue-500',
    daysLead: 5,
  },
  completed: {
    key: 'completed',
    label: 'Completed',
    shortLabel: 'Done',
    colorHex: '#16A34A',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60',
    badgeText: 'text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900',
    borderLeft: 'border-l-4 border-l-emerald-600',
    dotBg: 'bg-emerald-600',
    hoverBg: 'hover:border-emerald-500',
    daysLead: 0,
  },
};

export function getPriorityConfig(priority: PriorityType, completed: boolean = false): PriorityConfig {
  if (completed) {
    return PRIORITY_MAP.completed;
  }
  return PRIORITY_MAP[priority] || PRIORITY_MAP.due_today;
}

export function calculateDefaultPriority(dueIsoString: string): PriorityType {
  const due = new Date(dueIsoString);
  const now = new Date();
  const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffHours <= 24) {
    return 'due_today';
  } else if (diffHours <= 48) {
    return '2_day';
  } else if (diffHours <= 72) {
    return '3_day';
  } else {
    return '5_day';
  }
}
