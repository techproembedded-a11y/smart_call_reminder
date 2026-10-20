import React from 'react';
import type { Reminder } from '../../types/reminder';
import { PriorityBadge } from './PriorityBadge';
import { getPriorityConfig } from '../../utils/priority';
import { formatDate, formatRelativeDeadline } from '../../utils/date';
import { Phone, Clock, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';

interface ReminderCardProps {
  reminder: Reminder;
  onToggleComplete: (id: number) => void;
  onSelect: (reminder: Reminder) => void;
}

export const ReminderCard: React.FC<ReminderCardProps> = ({
  reminder,
  onToggleComplete,
  onSelect,
}) => {
  const config = getPriorityConfig(reminder.priority, reminder.completed);
  const relative = formatRelativeDeadline(reminder.due_datetime, reminder.completed);

  return (
    <div
      onClick={() => onSelect(reminder)}
      className={`group relative flex flex-col justify-between bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-800 hover:shadow-md transition-all cursor-pointer ${config.borderLeft} ${
        reminder.completed ? 'opacity-70 bg-slate-50/50 dark:bg-slate-900/50' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Toggle checkbox & Title */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete(reminder.id);
            }}
            className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
              reminder.completed
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'border-slate-300 dark:border-slate-600 hover:border-blue-500 bg-white dark:bg-slate-800'
            }`}
            title={reminder.completed ? 'Mark as incomplete' : 'Mark as complete'}
          >
            {reminder.completed && <CheckCircle className="w-4 h-4 stroke-[2.5]" />}
          </button>

          <div className="min-w-0 flex-1">
            <h3
              className={`font-semibold text-slate-900 dark:text-slate-100 text-base leading-snug break-words ${
                reminder.completed ? 'line-through text-slate-500 dark:text-slate-400' : ''
              }`}
            >
              {reminder.task_title}
            </h3>

            {/* Phone number and call time */}
            {reminder.phone_number && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <Phone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="font-medium tracking-wide">{reminder.phone_number}</span>
                {reminder.call_datetime && (
                  <span className="text-slate-400 dark:text-slate-500">
                    • Called {formatDate(reminder.call_datetime)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Priority Badge */}
        <div className="shrink-0 flex items-center gap-2">
          <PriorityBadge priority={reminder.priority} completed={reminder.completed} />
        </div>
      </div>

      {/* Voice note / note preview */}
      {reminder.voice_text && (
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800/80">
          "{reminder.voice_text}"
        </p>
      )}

      {/* Footer: Due date info & actions */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          {relative.isOverdue ? (
            <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
          ) : (
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          )}
          <span className={relative.isOverdue ? 'text-red-600 font-semibold' : 'text-slate-600 dark:text-slate-300'}>
            {formatDate(reminder.due_datetime)}
          </span>
          <span className="text-slate-400">•</span>
          <span className={relative.isOverdue ? 'text-red-600 font-medium' : 'text-slate-500'}>
            {relative.text}
          </span>
        </div>

        <div className="flex items-center gap-1 text-slate-400 group-hover:text-blue-600 transition-colors">
          <span className="text-xs font-medium">Details</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
